// constants.js — チーム・メタボリズム ゲーム定数
// 更新日時: 2026-03-18

const CONSTANTS = {
  ROUNDS: 8,
  INITIAL_COHESION: 5,      // 結束度: 4→5に戻し（崩壊まで余裕を持たせる）
  INITIAL_FAVOR: 5,
  INITIAL_LOBBY_CARDS: 2,
  INITIAL_HAND_SIZE: 4,
  MAX_HAND_SIZE: 7,
  MIN_HAND_SIZE: 3,
  MAX_SLOTS: 7,
  PENALTY_ZONE_LIMIT: 3,
  ACTIONS_PER_TURN: 3,
  MAX_BURNOUT: 8,
  MAX_COHESION: 10,
  MAX_FAVOR: 10,
  RECON_LIMIT: 3,

  // 病院長の評価ペナルティ（1に緩和: 下がりすぎ防止）
  FAVOR_PENALTY_CRISIS: 1,
  FAVOR_PENALTY_PUSHOUT: 1,

  // 結束度ペナルティ（緩和）
  COHESION_PENALTY_DROPOUT: 2,   // 脱落時: 3→2
  COHESION_PENALTY_TRIAGE: 1,    // トリアージ時: 2→1

  // バーンアウト倍率（1 = 等倍）
  BURNOUT_MULTIPLIER: 1,

  // 根回しカード補充量（毎ラウンド）
  LOBBY_REFILL_PER_ROUND: 1,     // 全員に配布する枚数（1に維持）

  // 手札補充量（毎ターン開始時にデッキから引く枚数）
  CARDS_DRAWN_PER_TURN: 2,       // 3→2に減少

  PATIENTS_PER_ROUND: { 1:1, 2:2, 3:2, 4:3, 5:3, 6:3, 7:4, 8:4 },
  PATIENTS_PER_ROUND_3P: { 1:1, 2:1, 3:1, 4:2, 5:2, 6:2, 7:3, 8:3 },

  DIFFICULTY: {
    入門: { crisisCount: 3 },
    標準: { crisisCount: 4 },
    上級: { crisisCount: 5 },
    地獄: { crisisCount: 6 }
  },

  COHESION_EFFECTS: {
    HIGH:     { min: 8, max: 10, desc: "高結束" },
    NORMAL:   { min: 5, max: 7,  desc: "標準" },
    LOW:      { min: 3, max: 4,  desc: "低結束" },
    CRITICAL: { min: 1, max: 2,  desc: "危機的", autoPenalty: true },
    COLLAPSE: { min: 0, max: 0,  desc: "崩壊", defeat: true }
  },

  FAVOR_EFFECTS: {
    10: { name: "絶大な信頼", desc: "リーダーに根回し+1、手札+1、BN+2" },
    9: { name: "全面支持", desc: "リーダーに根回し+1、手札+1、BN+1" },
    8: { name: "強い支持", desc: "リーダーに根回し+1、手札+1" },
    7: { name: "好意的", desc: "効果なし" },
    6: { name: "やや好意的", desc: "効果なし" },
    5: { name: "中立", desc: "効果なし" },
    4: { name: "やや不満", desc: "効果なし" },
    3: { name: "不満", desc: "効果なし" },
    2: { name: "敵対的", desc: "リーダーにBN+1" },
    1: { name: "敵対", desc: "リーダーにBN+1、結束度-1" },
    0: { defeat: true, name: "完全敵対", desc: "即時敗北" }
  },

  ALERT_BURNOUT: {
    "通常": 0,
    "要注意": 1,
    "要警戒": 2
  },

  PLAYER_CONFIGS: {
    3: { professions: ["R01","R02","R03"], required: true },
    4: { professions: ["R01","R02","R03","R04"] },
    5: { professions: ["R01","R02","R03","R04","R05"] },
    6: { professions: ["R01","R02","R03","R04","R05","R06"] }
  },

  // 選択可能な職種ID（R06, R08はマネジメントカード化のため除外）
  SELECTABLE_PROFESSIONS: ["R01","R02","R03","R04","R05","R06"]
};
