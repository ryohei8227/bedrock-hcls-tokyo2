import { NextRequest } from 'next/server';
import {
  BedrockAgentRuntimeClient,
  InvokeInlineAgentCommand
} from '@aws-sdk/client-bedrock-agent-runtime';
import {
  BedrockAgentClient,
  ListAgentAliasesCommand,
  GetAgentAliasCommand
} from '@aws-sdk/client-bedrock-agent';
import { a, p } from 'framer-motion/client';

const REGION = 'us-west-2';

const runtimeClient = new BedrockAgentRuntimeClient({ region: REGION });
const controlClient = new BedrockAgentClient({ region: REGION });

export async function getAgentAliasArnByName(agentId) {
  try {
    const listCommand = new ListAgentAliasesCommand({ agentId });
    const listResponse = await controlClient.send(listCommand);
    const latestAlias = listResponse.agentAliasSummaries?.sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    )[0];
    if (!latestAlias) return null;

    const getCommand = new GetAgentAliasCommand({
      agentId,
      agentAliasId: latestAlias.agentAliasId
    });
    const getResponse = await controlClient.send(getCommand);
    return getResponse.agentAlias?.agentAliasArn;
  } catch (error) {
    console.error('Error getting alias ARN:', error);
    throw error;
  }
}

export async function invokeInlineAgentHelper(requestParams) {
  try {
    const command = new InvokeInlineAgentCommand(requestParams);
    const response = await runtimeClient.send(command);
    return response;
  } catch (error) {
    console.error('Error invoking inline agent:', error);
    throw error;
  }
}

function extractAndRemoveImageUrl(text: string): [string | null, string] {
  const imageUrlRegex = /(https:\/\/[^\s"]+\.(png|jpg|jpeg|webp)[^\s"]*)/i;
  const match = text.match(imageUrlRegex);
  const imageUrl = match ? match[1] : null;
  const cleanedText = match ? text.replace(imageUrlRegex, '').trim() : text;
  return [imageUrl, cleanedText];
}


export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const { message, agents, agent_instruction, requestId } = await req.json();
  const sessionId = requestId || `session-${Date.now()}`;

  const log = (msg: string, ...args: any[]) => {
    console.log(`[${sessionId}] ${msg}`, ...args);
  };

  log('Received chat request', { message, agent_instruction, agentCount: agents.length });

  try {
    const foundationModel = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0';

    log('Resolving agent aliases...');
    const collaboratorConfigurations = await Promise.all(
      agents.map(async (agent) => {
        const agentAliasArn = await getAgentAliasArnByName(agent.id || agent.name);
        log(`Resolved agent "${agent.name}" to ARN`, agentAliasArn);
        return {
          collaboratorName: agent.name,
          collaboratorInstruction: agent_instruction,
          agentAliasArn,
          relayConversationHistory: 'TO_COLLABORATOR'
        };
      })
    );

    const requestParams = {
      foundationModel,
      instruction: agent_instruction,
      sessionId,
      endSession: false,
      enableTrace: true,
      agentCollaboration: 'SUPERVISOR_ROUTER',
      inputText: message,
      collaboratorConfigurations
    };

    log('Invoking agent collaboration', requestParams);
    const result = await invokeInlineAgentHelper(requestParams);
    log('Agent invocation started');

    const stream = new ReadableStream({
      async start(controller) {
        let finalMessage = '';
        let imageUrl = null;
        let step = 1;
        let inputTokens = 0;
        let outputTokens = 0;

        try {
          for await (const event of result.completion) {
  
            const agentId = event.trace?.agentId || 'unknown-agent';
  
            if (event.chunk?.bytes) {
              const text = new TextDecoder('utf-8').decode(event.chunk.bytes);
              finalMessage += text;
              log('Received chunk', { text });
  
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', data: text })}\n\n`));
            }
  
            if (event.trace?.trace?.orchestrationTrace) {
              const trace = event.trace.trace.orchestrationTrace;
              log('Processing orchestration trace', trace);
  
              const toolInput = trace.invocationInput?.actionGroupInvocationInput;
              if (toolInput) {
                log('Tool input received', toolInput);
  
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'tool',
                  step,
                  agent: agentId,
                  function: toolInput.function || '',
                  apiPath: toolInput.apiPath || '',
                  executionType: toolInput.executionType || '',
                  parameters: toolInput.parameters || []
                })}\n\n`));
  
                // if(toolInput.executionType === 'RETURN_CONTROL') {
                //   if(toolInput.function === 'showImage'){
                //     imageUrl = toolInput.parameters[0].value;
                //     break;
                //   }
                // } else {
                //   controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                //     type: 'tool',
                //     step,
                //     agent: agentId,
                //     function: toolInput.function || '',
                //     apiPath: toolInput.apiPath || '',
                //     executionType: toolInput.executionType || '',
                //     parameters: toolInput.parameters || []
                //   })}\n\n`));
                // }
                step++;
              }
  
              if (trace.rationale?.text) {
                log('Rationale received', trace.rationale.text);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'rationale',
                  step,
                  agent: "Model",
                  text: trace.rationale.text
                })}\n\n`));
                step++;
              }
  
              const agentColab = trace.invocationInput?.agentCollaboratorInvocationInput;
              if (agentColab) {
                log(`Agent collaborator input from "${agentColab.agentCollaboratorName}"`, agentColab.input.text);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'agent-collaborator',
                  step,
                  agent: agentColab.agentCollaboratorName,
                  text: agentColab.input.text
                })}\n\n`));
                step++;
              }
  
              const obsTool = trace.observation?.actionGroupInvocationOutput?.text;
              if (obsTool) {
                log(`Tool observation from "${agentId}"`, obsTool);
  
                const [extractedUrl, cleanedText] = extractAndRemoveImageUrl(obsTool);
                if (extractedUrl && !imageUrl) {
                  imageUrl = extractedUrl;
                  log('Image URL captured from observation text', imageUrl);
                }
  
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'observation',
                  step,
                  agent: agentId,
                  text: cleanedText
                })}\n\n`));
                step++;
              }
  
  
              const finalResp = trace.observation?.finalResponse;
              if (finalResp?.text) {
                log(`Final response from "${agentId}"`, finalResp.text);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'observation',
                  step,
                  agent: agentId,
                  text: finalResp.text
                })}\n\n`));
                step++;
              }
  
              const usage = trace.modelInvocationOutput?.metadata?.usage;
              if (usage) {
                inputTokens += usage.inputTokens || 0;
                outputTokens += usage.outputTokens || 0;
                log('Model usage stats', usage);
              }
  
              const attachment = finalResp?.attachments?.[0];
              if (attachment?.url) {
                imageUrl = attachment.url;
                log('Image URL captured from response', imageUrl);
              }
            }
          }
  
        } catch (streamError) {
          log('Error during streaming', streamError);
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            step,
            agent: 'Model',
            text: streamError + ' ' + requestId || 'An error occurred during streaming.',
          })}\n\n`));

          finalMessage = "Sorry ! I am having trouble processing your request. Please try again later.";

        }finally{

          const endPayload = {
            type: 'end',
            finalMessage,
            image: imageUrl,
            requestId: sessionId
          };
          log('Streaming final message and closing connection', endPayload);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(endPayload)}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      }
    });
  } catch (err) {
    log('Error during processing', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}


