export async function POST(req: Request) {
  const { message, agents } = await req.json();

  const agentNames = agents.map((a: any) => a.name).join(', ');
  const reply = `🤖 [${agentNames}] have processed your message: "${message}". Here's their collective insight.`;

  const trace = `Trace:\n- Involved agents: ${agentNames}\n- Message received: "${message}"\n- Simulated reasoning path...`;

  return Response.json({ reply, trace });
}
