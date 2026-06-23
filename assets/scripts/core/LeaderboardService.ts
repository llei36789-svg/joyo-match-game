import { GameConfig } from "./GameConfig";

export type LeaderboardPeriod = "daily" | "weekly";

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  nickname: string;
  avatarText: string;
  score: number;
  achievedAt: number;
  isSelf: boolean;
}

export interface LeaderboardSnapshot {
  period: LeaderboardPeriod;
  self: LeaderboardEntry | null;
  entries: LeaderboardEntry[];
  updatedAt: number;
  error?: string;
}

interface StoredBest {
  score: number;
  achievedAt: number;
}

type HttpFetch = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<{
  ok: boolean;
  json(): Promise<unknown>;
}>;

interface ServerEntry {
  rank?: number;
  playerId?: string;
  nickname?: string;
  avatarText?: string;
  score?: number;
  achievedAt?: number;
  isSelf?: boolean;
}

interface ServerSnapshot {
  self?: ServerEntry | null;
  entries?: ServerEntry[];
  updatedAt?: number;
}

export class LeaderboardService {
  private readonly playerId = GameConfig.leaderboard.playerId;
  private readonly nickname = GameConfig.leaderboard.nickname;
  private readonly mockNames = [
    "星河", "小熊糖", "奶油云", "阿橘", "蓝莓", "可乐冰", "晴天", "月亮船",
    "柚子", "团子", "栗子", "糖霜", "桃桃", "风铃", "咕噜", "小满",
    "泡芙", "浅浅", "阿布", "晴宝", "微光", "甜豆", "可可", "南瓜派",
  ];

  async submitScore(score: number): Promise<void> {
    if (score <= 0) {
      return;
    }

    await Promise.all([
      this.submitScoreForPeriod("daily", score),
      this.submitScoreForPeriod("weekly", score),
    ]);
  }

  async fetchSnapshot(period: LeaderboardPeriod, page = 1, pageSize = GameConfig.leaderboard.pageSize): Promise<LeaderboardSnapshot> {
    const remote = await this.fetchSnapshotFromServer(period, page, pageSize);
    if (remote) {
      return remote;
    }

    return this.buildLocalSnapshot(period, page, pageSize);
  }

  private async submitScoreForPeriod(period: LeaderboardPeriod, score: number): Promise<void> {
    const remoteUpdated = await this.submitScoreToServer(period, score);
    if (remoteUpdated) {
      return;
    }

    const key = this.getSelfStorageKey(period);
    const current = this.readStoredBest(key);
    if (current && current.score >= score) {
      return;
    }

    this.writeStoredBest(key, {
      score,
      achievedAt: Date.now(),
    });
  }

  private async fetchSnapshotFromServer(period: LeaderboardPeriod, page: number, pageSize: number): Promise<LeaderboardSnapshot | null> {
    const baseUrl = GameConfig.leaderboard.serverBaseUrl.trim();
    const request = this.getFetch();
    if (!baseUrl || !request) {
      return null;
    }

    try {
      const response = await request(
        `${baseUrl}/leaderboard?period=${period}&page=${page}&pageSize=${pageSize}`,
        { method: "GET" },
      );
      if (!response.ok) {
        return null;
      }

      const data = await response.json() as ServerSnapshot;
      const entries = (data.entries ?? []).map((entry, index) => this.normalizeServerEntry(entry, index + 1));
      return {
        period,
        self: data.self ? this.normalizeServerEntry(data.self, data.self.rank ?? 0) : null,
        entries,
        updatedAt: data.updatedAt ?? Date.now(),
      };
    } catch {
      return null;
    }
  }

  private async submitScoreToServer(period: LeaderboardPeriod, score: number): Promise<boolean> {
    const baseUrl = GameConfig.leaderboard.serverBaseUrl.trim();
    const request = this.getFetch();
    if (!baseUrl || !request) {
      return false;
    }

    try {
      const response = await request(`${baseUrl}/leaderboard/score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          period,
          score,
          playerId: this.playerId,
          nickname: this.nickname,
          achievedAt: Date.now(),
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private normalizeServerEntry(entry: ServerEntry, fallbackRank: number): LeaderboardEntry {
    const nickname = entry.nickname ?? "玩家";
    return {
      rank: entry.rank ?? fallbackRank,
      playerId: entry.playerId ?? "",
      nickname,
      avatarText: entry.avatarText ?? nickname.slice(0, 1),
      score: entry.score ?? 0,
      achievedAt: entry.achievedAt ?? Date.now(),
      isSelf: entry.isSelf ?? entry.playerId === this.playerId,
    };
  }

  private getFetch(): HttpFetch | null {
    const request = (globalThis as { fetch?: HttpFetch }).fetch;
    return typeof request === "function" ? request : null;
  }

  private buildLocalSnapshot(period: LeaderboardPeriod, page: number, pageSize: number): LeaderboardSnapshot {
    const entries = this.buildMockEntries(period);
    const selfBest = this.readStoredBest(this.getSelfStorageKey(period));
    if (selfBest) {
      entries.push({
        rank: 0,
        playerId: this.playerId,
        nickname: this.nickname,
        avatarText: "我",
        score: selfBest.score,
        achievedAt: selfBest.achievedAt,
        isSelf: true,
      });
    }

    entries.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.achievedAt - b.achievedAt;
    });

    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    const self = entries.find((entry) => entry.isSelf) ?? null;
    const start = Math.max(0, (page - 1) * pageSize);
    const pageEntries = entries.slice(start, start + pageSize);

    return {
      period,
      self,
      entries: pageEntries,
      updatedAt: Date.now(),
    };
  }

  private buildMockEntries(period: LeaderboardPeriod): LeaderboardEntry[] {
    const periodKey = this.getPeriodKey(period);
    return this.mockNames.map((name, index) => {
      const seed = this.hash(`${periodKey}-${index}-${name}`);
      const score = 1200 + (seed % 16000) + Math.max(0, this.mockNames.length - index) * 130;
      const achievedAt = this.getPeriodStartMs(period) + (seed % 72000000);
      return {
        rank: 0,
        playerId: `mock-${index}`,
        nickname: name,
        avatarText: name.slice(0, 1),
        score,
        achievedAt,
        isSelf: false,
      };
    });
  }

  private getSelfStorageKey(period: LeaderboardPeriod): string {
    return `joyo-leaderboard-${period}-${this.getPeriodKey(period)}-${this.playerId}`;
  }

  private getPeriodKey(period: LeaderboardPeriod): string {
    const date = new Date();
    if (period === "daily") {
      return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    }

    const monday = new Date(date);
    const day = monday.getDay() || 7;
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - day + 1);
    return `${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`;
  }

  private getPeriodStartMs(period: LeaderboardPeriod): number {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    if (period === "weekly") {
      const day = date.getDay() || 7;
      date.setDate(date.getDate() - day + 1);
    }
    return date.getTime();
  }

  private readStoredBest(key: string): StoredBest | null {
    try {
      const raw = globalThis.localStorage?.getItem(key);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as StoredBest;
      return typeof parsed.score === "number" && typeof parsed.achievedAt === "number" ? parsed : null;
    } catch {
      return null;
    }
  }

  private writeStoredBest(key: string, value: StoredBest): void {
    try {
      globalThis.localStorage?.setItem(key, JSON.stringify(value));
    } catch {
      // 本地存储不可用时只影响模拟榜单，不影响游戏主流程。
    }
  }

  private hash(input: string): number {
    let value = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      value ^= input.charCodeAt(i);
      value = Math.imul(value, 16777619);
    }
    return Math.abs(value);
  }
}
