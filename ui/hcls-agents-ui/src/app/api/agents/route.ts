import { NextResponse } from 'next/server';
import { BedrockAgentClient, ListAgentsCommand, GetAgentCommand, ListTagsForResourceCommand } from "@aws-sdk/client-bedrock-agent";

const REGION = "us-west-2"; 

const client = new BedrockAgentClient({ region: REGION });

async function listAgents() {
    try {
      const command = new ListAgentsCommand({ maxResults: 10 });
      const response = await client.send(command);
      console.log("Fetched Agents:", response.agentSummaries);
      return response.agentSummaries || [];
    } catch (error) {
      console.error("Error fetching agents:", error);
      return [];
    }
}

async function getAgentTags(agentArn: string) {
    try {
      const command = new ListTagsForResourceCommand({ resourceArn: agentArn });
      const response = await client.send(command);
      return response.tags ? Object.entries(response.tags).map(([key, value]) => `${key}: ${value}`) : [];
    } catch (error) {
      console.error(`Error fetching tags for agent ARN ${agentArn}:`, error);
      return [];
    }
}

async function getAgentDetails(agentId: string, agentArn: string) {
    try {
      const command = new GetAgentCommand({ agentId });
      const response = await client.send(command);
      return {
        id: response.agent.agentId,
        name: response.agent.agentName,
        description: response.agent.description || "No description available.",
        version: response.agent.agentVersion,
        foundationModel: response.agent.foundationModel || "N/A",
        orchestrationType: response.agent.orchestrationType || "Default",
        createdAt: response.agent.createdAt ? response.agent.createdAt.toISOString() : "N/A",
        updatedAt: response.agent.updatedAt ? response.agent.updatedAt.toISOString() : "N/A",
        tags: await getAgentTags(response.agent.agentArn),
        image: "/images/default_agent_icon.png",
        category: "Healthcare",
        agentCollaboration: response.agent.agentCollaboration || "N/A",
        agentResourceRoleArn: response.agent.agentResourceRoleArn || "N/A",
        agentStatus: response.agent.agentStatus,
        instruction: response.agent.instruction || "N/A",
        orchestrationType: response.agent.orchestrationType || "DEFAULT",
        promptOverrideConfiguration: response.agent.promptOverrideConfiguration || {}
      };
    } catch (error) {
      console.error(`Error fetching details for agent ${agentId}:`, error);
      return null;
    }
}

export async function GET() {
    try {
      const agents = await listAgents();

      const detailedAgents = await Promise.all(
        agents.map(async (agent) => getAgentDetails(agent.agentId, agent.agentArn))
      );

      const validAgents = detailedAgents.filter(agent => agent !== null);

      return NextResponse.json(validAgents);
    } catch (error) {
      console.error("Error fetching Bedrock agents:", error);
      return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
    }
}
