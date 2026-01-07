import { Agent } from './agent';

export class AgentPool {
  private pool: Agent[] = [];
  private active: Set<Agent> = new Set();
  private nextId: number = 0;
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;

    // Pre-allocate some agents
    const preAllocate = Math.min(100, maxSize);
    for (let i = 0; i < preAllocate; i++) {
      this.pool.push(new Agent(this.nextId++));
    }
  }

  acquire(): Agent | null {
    if (this.active.size >= this.maxSize) {
      return null;
    }

    let agent: Agent;

    if (this.pool.length > 0) {
      agent = this.pool.pop()!;
    } else {
      agent = new Agent(this.nextId++);
    }

    this.active.add(agent);
    return agent;
  }

  release(agent: Agent): void {
    if (!this.active.has(agent)) return;

    this.active.delete(agent);
    agent.reset();
    this.pool.push(agent);
  }

  getActiveAgents(): Agent[] {
    return Array.from(this.active);
  }

  get activeCount(): number {
    return this.active.size;
  }

  get poolSize(): number {
    return this.pool.length;
  }
}
