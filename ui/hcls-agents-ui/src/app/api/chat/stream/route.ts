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
import { p } from 'framer-motion/client';

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

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const { message, agents, agent_instruction } = await req.json();

  const foundationModel = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0';
  const sessionId = `session-${Date.now()}`;

  const collaboratorConfigurations = await Promise.all(
    agents.map(async (agent) => {
      const agentAliasArn = await getAgentAliasArnByName(agent.id || agent.name);
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

  const result = await invokeInlineAgentHelper(requestParams);

  const stream = new ReadableStream({
    async start(controller) {
      let finalMessage = '';
      let imageUrl = null;
      let step = 1;
      let inputTokens = 0;
      let outputTokens = 0;

      for await (const event of result.completion) {
        const agentId = event.trace?.agentId || 'unknown-agent';

        // Handle chunked response
        if (event.chunk?.bytes) {
          const text = new TextDecoder('utf-8').decode(event.chunk.bytes);
          finalMessage += text;

          const chunkPayload = {
            type: 'chunk',
            data: text
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunkPayload)}\n\n`));
        }

        // Handle trace logic
        if (event.trace?.trace?.orchestrationTrace) {
          const trace = event.trace.trace.orchestrationTrace;

          console.log('Trace-------:', JSON.stringify(trace, null, 2));

          // TOOL: Invocation Input
          const toolInput = trace.invocationInput?.actionGroupInvocationInput;
          if (toolInput) {
            const payload = {
              type: 'tool',
              step,
              agent: agentId,
              function: toolInput.function || '',
              apiPath: toolInput.apiPath || '',
              executionType: toolInput.executionType || '',
              parameters: toolInput.parameters || []
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            step += 1;
          }

          // RATIONALE
          if (trace.rationale?.text) {
            const payload = {
              type: 'rationale',
              step,
              agent: "Model",
              text: trace.rationale.text
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            step += 1;
          }

          //AENT COLLLABORATOR
          const agentColaboratorInput = trace.invocationInput?.agentCollaboratorInvocationInput
          if (agentColaboratorInput) {
            const payload = {
              type: 'agent-collaborator',
              step,
              agent: agentColaboratorInput.agentCollaboratorName,
              text: agentColaboratorInput.input.text
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            step += 1;
          }

          // OBSERVATION: Tool output
          const obsTool = trace.observation?.actionGroupInvocationOutput?.text;
          if (obsTool) {
            const payload = {
              type: 'observation',
              step,
              agent: agentId,
              text: obsTool
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            step += 1;
          }

          // OBSERVATION: Final response
          const finalResp = trace.observation?.finalResponse;
          if (finalResp?.text) {
            const payload = {
              type: 'observation',
              step,
              agent: agentId,
              text: finalResp.text
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            step += 1;
          }

          // Track usage (not streamed)
          const usage = trace.modelInvocationOutput?.metadata?.usage;
          if (usage) {
            inputTokens += usage.inputTokens || 0;
            outputTokens += usage.outputTokens || 0;
          }

          // Capture image if attached
          const attachment = finalResp?.attachments?.[0];
          if (attachment?.url) {
            imageUrl = attachment.url;
          }
        }
      }

      // Final message
      const endPayload = {
        type: 'end',
        finalMessage,
        image: imageUrl
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(endPayload)}\n\n`));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  });
}

