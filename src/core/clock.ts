export class SongClock {
  private startAt = 0;
  private pausedAt: number | null = null;
  private started = false;

  constructor(private now: () => number) {}

  start(): void {
    this.startAt = this.now();
    this.pausedAt = null;
    this.started = true;
  }

  stop(): void {
    this.started = false;
    this.pausedAt = null;
  }

  pause(): void {
    if (!this.running) return;
    this.pausedAt = this.time;
  }

  resume(): void {
    if (this.pausedAt === null) return;
    this.startAt = this.now() - this.pausedAt;
    this.pausedAt = null;
  }

  get time(): number {
    if (!this.started) return 0;
    return this.pausedAt ?? this.now() - this.startAt;
  }

  get running(): boolean {
    return this.started && this.pausedAt === null;
  }
}
