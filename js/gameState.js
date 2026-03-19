// gameState.js - ゲーム状態管理
// DATA と CONSTANTS はグローバルに定義済みと仮定
//
// 依存する定数の想定値:
//   CONSTANTS.INITIAL_COHESION       = 4
//   CONSTANTS.MAX_COHESION           = 10
//   CONSTANTS.INITIAL_FAVOR          = 5   // 病院長の評価: 中立
//   CONSTANTS.MAX_FAVOR              = 10
//   CONSTANTS.MAX_SLOTS              = 7   // 患者ゾーンスロット数
//   CONSTANTS.PENALTY_ZONE_LIMIT     = 3   // 放置ペナルティゾーン上限
//   CONSTANTS.MAX_BURNOUT            = 7   // バーンアウト最大値（到達で脱落=バースト）
//   CONSTANTS.INITIAL_HAND_SIZE      = 5
//   CONSTANTS.INITIAL_LOBBY_CARDS    = 2
//   CONSTANTS.ACTIONS_PER_TURN       = 3
//   CONSTANTS.ROUNDS           = 6
//   CONSTANTS.DIFFICULTY = {
//     beginner: { crisisCount: 3 },
//     standard: { crisisCount: 4 },
//     advanced: { crisisCount: 5 },
//     hell:     { crisisCount: 6 }
//   }

// ======================================================================
// PlayerState
// ======================================================================

class PlayerState {
  constructor(id, professionId) {
    this.id = id;
    this.professionId = professionId;
    this.profession = DATA.professions.find(p => p.id === professionId);

    // 手札
    this.hand = [];              // アクションカード手札
    this.actionDeck = [];        // 個人アクションデッキ
    this.lobbyCards = CONSTANTS.INITIAL_LOBBY_CARDS; // 根回しカード枚数

    // 秘密ミッション
    this.secretMission = null;
    this._missionChoices = [];   // 初期配布時の選択肢（2枚）

    // バーンアウト（職種別初期値を適用）
    this.burnout = (this.profession && this.profession.initialBurnout) || 0;

    // 状態: normal / eliminated（疲弊ペナルティ廃止）
    this.status = 'normal';

    // 固有スキル使用済みフラグ
    this.skillUsed = false;

    // ターン内状態
    this.actionsRemaining = 0;
    this.substituteUsedThisTurn = false;   // 私の仕事じゃないのに...（1ターン1回）

    // ラウンド内状態
    this.actionsUsedThisRound = 0;

    // 投票カード（解決した患者ケースの枚数 = VP）
    this.votingCards = 0;

    // パッシブ使用追跡（ラウンドごとにリセット）
    this.passiveUsedThisRound = false;     // 内科医パッシブ1、看護師パッシブ1など

    // E14「管理職への昇進オファー」受入状態
    this.promotionAccepted = false;

    // E15「育児休業」一時離席ラウンド残数
    this.leaveRoundsRemaining = 0;

    // C02「予算削減」縮小状態
    this.reduced = false;

    // C06「存在意義の喪失」モチベーション低下
    this.motivationLow = false;
  }
}

// ======================================================================
// GameState
// ======================================================================

class GameState {
  constructor(playerCount, difficulty, professionIds) {
    // --- 基本情報 ---
    this.playerCount = playerCount;
    this.difficulty = difficulty;
    this.round = 1;
    this.currentPhase = 'setup';
    // フェーズ名: setup / briefing(0) / event(1) / patient(2) / action(3) / resolve(4) / end(5) / gameover
    this.gameOver = false;
    this.gameOverReason = null;
    this.teamWin = false;

    // --- 共有ステート ---
    this.cohesion = CONSTANTS.INITIAL_COHESION;            // 結束度 0〜10
    this.cohesionFraction = 0;   // 0.5単位管理用（補完ルール: 超過アクション2回で+1）
    this.hospitalFavor = CONSTANTS.INITIAL_FAVOR;           // 病院長の評価 0〜10
    this.crisisMarkerCount = 0;                             // 危機マーカー累積

    // コミュニケーション制限（危機カード発動後のラウンド内フラグ）
    this.communicationRestricted = false;

    // 次の病院長の評価低下1回無効化（将来の拡張用）
    this.favorShieldActive = false;

    // A60「緊急チームミーティング」使用済み（1ゲーム1回）
    this.a60Used = false;

    // 根回し「情報偵察」使用回数（1ゲーム3回まで）
    this.reconUsed = 0;

    // トリアージ（1ラウンド1回）
    this.triageUsedThisRound = false;

    // ラウンド内解決数
    this.resolvedThisRound = 0;
    this.totalResolved = 0;

    // E18: 3回目アクションのバーンアウト免除フラグ
    this._noBurnoutOn3rdAction = false;

    // フェーズ0: リーダー指定の優先患者
    this.priorityPatientSlot = -1;
    this.priorityPatientResolved = false;

    // ラウンド中にバーンアウト閾値超過者がいなかったかフラグ
    this.nobodyExceededThreshold = true;

    // --- デッキ ---
    this.eventDeck = [];
    this.patientDeck = [];
    // 共通アクションデッキは廃止。各プレイヤーが player.actionDeck を持つ。
    this.discardPile = [];

    // --- 患者ゾーン（押し出し式 7スロット） ---
    this.patientSlots = new Array(CONSTANTS.MAX_SLOTS).fill(null);
    this.maxSlots = CONSTANTS.MAX_SLOTS;
    this.penaltyZone = [];

    // 各スロットへの提供済みアクション管理
    this.slotActions = new Array(CONSTANTS.MAX_SLOTS).fill(null).map(() => ({
      診察: 0,
      エデュケーション: 0,
      ソーシャル: 0,
      lastProvider: null  // 最後にアクション提供したプレイヤーID
    }));

    // --- プレイヤー ---
    this.players = [];
    this.currentTurnIndex = 0;
    this.leaderIndex = 0;
    this.startPlayerIndex = 0;
    this.eliminatedCount = 0;

    // --- NPC（3人プレイ） ---
    this.npcs = [];
    this.isNpcGame = playerCount <= 3;

    // --- 難易度オプション ---
    this.difficultyOptions = {
      strategyTimeMultiplier: 1,
      initialHandSize: CONSTANTS.INITIAL_HAND_SIZE,
      extraPatientsPerRound: 0,
      burnoutThresholdBonus: 0,
      skillUsesAllowed: 1,
      freeCommunication: false
    };

    // --- デブリーフィング用履歴 ---
    this.cohesionHistory = [];
    this.penaltyHistory = [];

    // --- 投票フェーズ ---
    this.votingPhaseData = null;

    // --- ログ ---
    this.log = [];

    // --- 危機カード効果フラグ ---

    // C01: スタッフ慢性的不足 → スロット数減少
    this.slotsReduced = false;

    // （チームアクションルール廃止済み）

    // E03: このラウンドのアクション1人1枚制限（削除済みイベントだが後方互換で保持）
    this.actionCardLimitOne = false;

    // E18: ソーシャルカードに根回し×1追加必要（旧効果、現在は未使用）
    this.socialNeedsLobby = false;

    // C03: チーム分裂状態
    this.splitActive = false;
    this.splitGroups = [[], []];   // グループA, Bのプレイヤーid配列
    this.splitRoundsRemaining = 0;

    // 病院長の評価7+: 毎ラウンドアクションカード+1枚（チーム共有ドロー）
    // → フェーズ5のラウンド終了処理で判定

    // 病院長の評価効果: 8+=リーダーに根回し+手札、9+=BN+1も、10=BN+2も
    // → フェーズ5 / フェーズ4で判定
  }

  // ==================================================================
  // ログ追加
  // ==================================================================

  addLog(message) {
    this.log.push({
      round: this.round,
      phase: this.currentPhase,
      message,
      timestamp: Date.now()
    });
    console.log(`[R${this.round}/${this.currentPhase}] ${message}`);
  }

  // ==================================================================
  // 状態変更用セッター（変更時に即時敗北チェック）
  // ==================================================================

  /**
   * 結束度を変更する
   * @param {number} delta - 変更量（正: 増加、負: 減少）
   * @returns {string|null} 敗北理由（敗北時）またはnull
   */
  changeCohesion(delta) {
    this.cohesion = Math.max(0, Math.min(CONSTANTS.MAX_COHESION, this.cohesion + delta));
    if (delta !== 0) {
      this.addLog(`結束度 ${delta > 0 ? '+' : ''}${delta} → ${this.cohesion}`);
    }
    return this.checkDefeat();
  }

  /**
   * 結束度の端数（0.5単位）を加算する
   * 補完ルール: 超過アクション提供で+0.5、2回分貯まったら結束度+1
   * @param {number} delta - 加算量（通常0.5）
   * @returns {string|null} 敗北理由またはnull
   */
  addCohesionFraction(delta) {
    this.cohesionFraction += delta;
    if (this.cohesionFraction >= 1.0) {
      this.cohesionFraction -= 1.0;
      return this.changeCohesion(1);
    }
    return null;
  }

  /**
   * 病院長の評価を変更する
   * favorShieldActive で低下1回を無効化
   * @param {number} delta - 変更量
   * @returns {string|null} 敗北理由またはnull
   */
  changeFavor(delta) {
    if (delta < 0 && this.favorShieldActive) {
      this.favorShieldActive = false;
      this.addLog('病院長の評価低下を無効化');
      return null;
    }
    this.hospitalFavor = Math.max(0, Math.min(CONSTANTS.MAX_FAVOR, this.hospitalFavor + delta));
    if (delta !== 0) {
      this.addLog(`病院長の評価 ${delta > 0 ? '+' : ''}${delta} → ${this.hospitalFavor}`);
    }
    return this.checkDefeat();
  }

  /**
   * プレイヤーのバーンアウトを変更する
   * 看護師パッシブ2: 受取時1個軽減
   * 理学療法士パッシブ2: ダイス4以上で回避
   * 臨床心理士パッシブ2: チーム全体のバーンアウト上限+1（MAX_BURNOUT+1で脱落判定）
   * @param {number} playerIndex - プレイヤーのインデックス
   * @param {number} delta - 変更量
   * @returns {string|null} 敗北理由またはnull
   */
  changeBurnout(playerIndex, delta, skipMultiplier) {
    const player = this.players[playerIndex];
    if (player.status === 'eliminated') return null;

    // skipMultiplier === true の場合は倍率を適用しない
    if (delta > 0 && !skipMultiplier && CONSTANTS.BURNOUT_MULTIPLIER) {
      delta = delta * CONSTANTS.BURNOUT_MULTIPLIER;
    }

    // パッシブ2は全職種廃止（パッシブ1のみ）

    player.burnout = Math.max(0, Math.min(CONSTANTS.MAX_BURNOUT, player.burnout + delta));

    if (delta !== 0) {
      this.addLog(
        `${player.profession.name} バーンアウト ${delta > 0 ? '+' : ''}${delta}` +
        ` → ${player.burnout}/${player.profession.burnoutThreshold}`
      );
    }

    // 脱落チェック: バーンアウトが上限（MAX_BURNOUT=8）に到達
    if (player.burnout >= CONSTANTS.MAX_BURNOUT && player.status !== 'eliminated') {
      player.status = 'eliminated';
      this.eliminatedCount++;
      this.addLog(`${player.profession.name} が脱落！（脱落数: ${this.eliminatedCount}）`);
      return this.checkDefeat();
    }

    return null;
  }

  /**
   * 患者カードを放置ペナルティゾーンに追加する
   * 1枚追加ごとに病院長の評価-1。3枚で即時敗北。
   * @param {object} card - 患者ケースカード
   * @returns {string|null} 敗北理由またはnull
   */
  addPenaltyCard(card) {
    this.penaltyZone.push(card);
    this.penaltyHistory.push({ round: this.round, card: card.title });
    this.addLog(`患者「${card.title}」が放置ペナルティゾーンへ（${this.penaltyZone.length}/${CONSTANTS.PENALTY_ZONE_LIMIT}）`);

    // 押し出し1枚ごとに病院長の評価-1
    const favorResult = this.changeFavor(-CONSTANTS.FAVOR_PENALTY_PUSHOUT);
    if (favorResult) return favorResult;

    // 押し出し1枚ごとに結束度-1（全患者共通）
    this.addLog(`患者放置ペナルティ: 結束度-1`);
    const cohResult = this.changeCohesion(-1);
    if (cohResult) return cohResult;

    // 要警戒カードの追加ペナルティ: さらに病院長の評価-1
    const alertLevel = card.alertLevel || card.警戒度 || card.alert || '通常';
    if (alertLevel === '要警戒') {
      this.addLog(`要警戒患者の放置！追加ペナルティ: 病院長の評価-1`);
      const favorResult2 = this.changeFavor(-1);
      if (favorResult2) return favorResult2;
    }

    return this.checkDefeat();
  }

  /**
   * 根回しカードを変更する
   * @param {number} playerIndex - プレイヤーのインデックス
   * @param {number} delta - 変更量
   */
  changeLobbyCards(playerIndex, delta) {
    const player = this.players[playerIndex];
    player.lobbyCards = Math.max(0, player.lobbyCards + delta);
    if (delta !== 0) {
      this.addLog(
        `${player.profession.name} 根回しカード ${delta > 0 ? '+' : ''}${delta}` +
        ` → ${player.lobbyCards}`
      );
    }
  }

  // ==================================================================
  // 患者ゾーン操作
  // ==================================================================

  /**
   * 患者ケースカードをスロット1に挿入し、既存カードを押し出す
   * スロット7から溢れたカードは放置ペナルティゾーンへ
   * @param {object} card - 患者ケースカード
   * @returns {string|null} 敗北理由またはnull
   */
  pushPatientCard(card) {
    const effectiveSlots = this.slotsReduced ? this.maxSlots - 1 : this.maxSlots;

    // スロット末尾のカードが押し出される場合
    if (this.patientSlots[effectiveSlots - 1] !== null) {
      const overflow = this.patientSlots[effectiveSlots - 1];
      const result = this.addPenaltyCard(overflow);
      if (result) return result;
    }

    // 全カードを1つ後方にシフト（末尾 → 先頭の順に処理）
    for (let i = effectiveSlots - 1; i > 0; i--) {
      this.patientSlots[i] = this.patientSlots[i - 1];
      this.slotActions[i] = { ...this.slotActions[i - 1] };
    }

    // スロット0（スロット1）に新カードを配置
    this.patientSlots[0] = card;
    this.slotActions[0] = {
      診察: 0,
      エデュケーション: 0,
      ソーシャル: 0,
      lastProvider: null
    };

    this.addLog(`患者「${card.title}」をスロット1に配置`);
    return null;
  }

  /**
   * ラウンドに応じた患者追加枚数を返す
   * 3人プレイ時は専用テーブル
   * @returns {number} 追加枚数
   */
  getPatientAddCount() {
    const table = (this.playerCount <= 3)
      ? CONSTANTS.PATIENTS_PER_ROUND_3P
      : CONSTANTS.PATIENTS_PER_ROUND;
    const base = table[this.round] || 1;
    const extra = this._extraPatientsThisRound || 0;
    return base + extra;
  }

  // ==================================================================
  // 即時敗北チェック
  // ==================================================================

  /**
   * 即時敗北条件をチェックする
   * - 脱落3枚以上
   * - 結束度0（崩壊）
   * - 放置ペナルティゾーン3枚以上
   * - 病院長の評価0（完全敵対）
   * @returns {string|null} 敗北理由またはnull
   */
  checkDefeat() {
    if (this.gameOver) return this.gameOverReason;

    let reason = null;
    if (this.eliminatedCount >= 3) {
      reason = '脱落3枚以上';
    } else if (this.cohesion <= 0) {
      reason = '結束度が0（崩壊）';
    } else if (this.penaltyZone.length >= CONSTANTS.PENALTY_ZONE_LIMIT) {
      reason = '放置ペナルティゾーン3枚';
    } else if (this.hospitalFavor <= 0) {
      reason = '病院長の評価が0（完全敵対）';
    }

    if (reason) {
      this.gameOver = true;
      this.gameOverReason = reason;
      this.teamWin = false;
      this.currentPhase = 'gameover';
      this.addLog(`【即時敗北】${reason}`);
    }
    return reason;
  }

  // ==================================================================
  // チーム勝利チェック（6ラウンド終了時）
  // ==================================================================

  /**
   * チーム勝利条件を判定する
   * 1. 脱落2枚以下
   * 2. 結束度 >= 1
   * @returns {boolean} チーム勝利ならtrue
   */
  checkVictory() {
    const survived = this.eliminatedCount <= 2;
    const cohesionOk = this.cohesion >= 1;

    if (survived && cohesionOk) {
      this.teamWin = true;
      this.gameOver = true;
      this.gameOverReason = 'チーム勝利';
      this.currentPhase = 'gameover';
      this.addLog(`【チーム勝利】解決数: ${this.totalResolved}枚`);
      return true;
    } else {
      this.teamWin = false;
      this.gameOver = true;
      const reasons = [];
      if (!survived) reasons.push(`脱落${this.eliminatedCount}枚`);
      if (!cohesionOk) reasons.push(`結束度${this.cohesion}`);
      this.gameOverReason = `チーム敗北（${reasons.join('、')}）`;
      this.currentPhase = 'gameover';
      this.addLog(`【チーム敗北】${this.gameOverReason}`);
      return false;
    }
  }

  // ==================================================================
  // ラウンド管理
  // ==================================================================

  /**
   * ラウンド開始時のリセット処理
   */
  startRound() {
    // ラウンド内フラグリセット
    this.resolvedThisRound = 0;
    this.triageUsedThisRound = false;
    this.priorityPatientSlot = -1;
    this.priorityPatientResolved = false;
    this.nobodyExceededThreshold = true;
    this.actionCardLimitOne = false;
    this.socialNeedsLobby = false;
    this.communicationRestricted = false;
    this._noBurnoutOn3rdAction = false;

    // 結束度 1〜2（危機的）: ラウンド開始時にスロット7のカードを強制押し出し
    if (this.cohesion >= 1 && this.cohesion <= 2) {
      const effectiveSlots = this.slotsReduced ? this.maxSlots - 1 : this.maxSlots;
      const lastSlot = effectiveSlots - 1;
      if (this.patientSlots[lastSlot] !== null) {
        const card = this.patientSlots[lastSlot];
        this.patientSlots[lastSlot] = null;
        this.slotActions[lastSlot] = {
          診察: 0, エデュケーション: 0, ソーシャル: 0, lastProvider: null
        };
        this.addLog(`結束度${this.cohesion}（危機的）: スロット${lastSlot + 1}の患者を強制押し出し`);
        this.addPenaltyCard(card);
        if (this.gameOver) return;
      }
    }

    // プレイヤーのラウンド内フラグリセット
    for (const p of this.players) {
      p.actionsUsedThisRound = 0;
      p.passiveUsedThisRound = false;

      // E15: 一時離席ラウンド数カウントダウン
      if (p.leaveRoundsRemaining > 0) {
        p.leaveRoundsRemaining--;
        if (p.leaveRoundsRemaining === 0) {
          this.addLog(`${p.profession.name} が一時離席から復帰`);
        }
      }
    }

    // C03: 分裂ラウンド数カウントダウン
    if (this.splitActive && this.splitRoundsRemaining > 0) {
      this.splitRoundsRemaining--;
      if (this.splitRoundsRemaining <= 0) {
        this.splitActive = false;
        this.splitGroups = [[], []];
        this.addLog('チーム分裂が解除された');
      }
    }

    // デブリーフィング用の結束度履歴を記録
    this.cohesionHistory.push({ round: this.round, cohesion: this.cohesion });

    this.addLog(`=== ラウンド ${this.round} 開始 ===`);
  }

  /**
   * ターン開始時のリセット処理
   * @param {number} playerIndex - プレイヤーのインデックス
   */
  startTurn(playerIndex) {
    const player = this.players[playerIndex];
    let actions = CONSTANTS.ACTIONS_PER_TURN;

    // E14「管理職への昇進オファー」受入でアクション-1
    if (player.promotionAccepted) {
      actions -= 1;
    }

    player.actionsRemaining = actions;
    player.substituteUsedThisTurn = false;
    this.currentTurnIndex = playerIndex;
  }

  // ==================================================================
  // フェーズ5: ラウンド終了処理
  // ==================================================================

  /**
   * ラウンド終了処理を順に実行する
   * @returns {string|null} 敗北理由またはnull
   */
  processRoundEnd() {
    this.currentPhase = 'end';

    // 1. 病院長の評価の追加変動
    // （2枚以上解決ボーナスは廃止）

    // --- 病院長の評価効果（フェーズ5で適用） ---
    const leader = this.players[this.leaderIndex];
    const leaderIdx = this.leaderIndex;

    // 評価2「敵対的」: リーダーにバーンアウト+1
    if (this.hospitalFavor === 2 && leader.status !== 'eliminated') {
      this.addLog(`病院長の評価2: ${leader.profession.name}（リーダー）にバーンアウト+1`);
      const result = this.changeBurnout(leaderIdx, 1, true);
      if (result) return result;
    }

    // 評価1「敵対」: リーダーにバーンアウト+1、結束度-1
    if (this.hospitalFavor === 1) {
      if (leader.status !== 'eliminated') {
        this.addLog(`病院長の評価1: ${leader.profession.name}（リーダー）にバーンアウト+1`);
        const result = this.changeBurnout(leaderIdx, 1, true);
        if (result) return result;
      }
      const cohResult = this.changeCohesion(-1);
      if (cohResult) return cohResult;
    }

    // 評価8「強い支持」: リーダーに根回し+1、手札+1
    if (this.hospitalFavor === 8 && leader.status !== 'eliminated') {
      this.changeLobbyCards(leaderIdx, 1);
      const drawn = this.drawPlayerCards(leaderIdx, 1);
      leader.hand.push(...drawn);
      this.addLog(`病院長の評価8: ${leader.profession.name}に根回し+1、手札+1`);
    }

    // 評価9「全面支持」: リーダーに根回し+1、手札+1、BN+1
    if (this.hospitalFavor === 9 && leader.status !== 'eliminated') {
      this.changeLobbyCards(leaderIdx, 1);
      const drawn = this.drawPlayerCards(leaderIdx, 1);
      leader.hand.push(...drawn);
      this.changeBurnout(leaderIdx, 1, true);
      this.addLog(`病院長の評価9: ${leader.profession.name}に根回し+1、手札+1、BN+1`);
    }

    // 評価10「絶大な信頼」: リーダーに根回し+1、手札+1、BN+2
    if (this.hospitalFavor >= 10 && leader.status !== 'eliminated') {
      this.changeLobbyCards(leaderIdx, 1);
      const drawn = this.drawPlayerCards(leaderIdx, 1);
      leader.hand.push(...drawn);
      this.changeBurnout(leaderIdx, 2, true);
      this.addLog(`病院長の評価10: ${leader.profession.name}に根回し+1、手札+1、BN+2`);
    }

    // 結束度10: 全員バーンアウト+1（過度な結束のプレッシャー）
    if (this.cohesion >= 10) {
      this.addLog('結束度10: 全プレイヤーにバーンアウト+1');
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].status !== 'eliminated') {
          const result = this.changeBurnout(i, 1, true);
          if (result) return result;
        }
      }
    }
    // 結束度8〜9: 効果なし（自然回復は廃止）

    // 根回しカード補充: 全員に基本分のみ（評価による追加は上記でリーダーに個別適用済み）
    const baseRefill = CONSTANTS.LOBBY_REFILL_PER_ROUND || 1;
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      if (p.status === 'eliminated') continue;
      this.changeLobbyCards(i, baseRefill);
    }

    // 7. リーダー交代: 次の生存プレイヤーに移動
    this.startPlayerIndex = this.getNextActivePlayerIndex(this.startPlayerIndex);
    this.leaderIndex = this.startPlayerIndex;
    this.addLog(`リーダー交代 → 👑 ${this.players[this.leaderIndex].profession.name}`);

    // 8. 手札調整: 3枚未満のプレイヤーは3枚まで補充（個人デッキから）
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      if (p.status === 'eliminated') continue;
      while (p.hand.length < 3 && p.actionDeck.length > 0) {
        p.hand.push(p.actionDeck.pop());
      }
    }

    // 9. ラウンドトラッカーを進める（最終ラウンドでもインクリメントして超過させる）
    this.round++;
    return null;
  }

  // ==================================================================
  // ユーティリティ
  // ==================================================================

  /**
   * 生存プレイヤー数を返す
   * @returns {number}
   */
  getActivePlayerCount() {
    return this.players.filter(p => p.status !== 'eliminated').length;
  }

  /**
   * IDでプレイヤーを検索する
   * @param {string} id
   * @returns {PlayerState|undefined}
   */
  getPlayerById(id) {
    return this.players.find(p => p.id === id);
  }

  /**
   * プレイヤーの個人デッキからカードを引く
   * @param {number} playerIndex - プレイヤーのインデックス
   * @param {number} count - 引く枚数
   * @returns {Array} 引いたカードの配列
   */
  drawPlayerCards(playerIndex, count) {
    const player = this.players[playerIndex];
    const cards = [];
    for (let i = 0; i < count; i++) {
      if (player.actionDeck.length === 0) break;
      cards.push(player.actionDeck.pop());
    }
    return cards;
  }

  /**
   * アクションデッキからカードを引く（後方互換）
   * playerIndex が指定されていればそのプレイヤーのデッキから引く。
   * 指定なしの場合はリーダーのデッキから引く。
   * @param {number} count - 引く枚数
   * @param {number} [playerIndex] - プレイヤーのインデックス
   * @returns {Array} 引いたカードの配列
   */
  drawActionCards(count, playerIndex) {
    const idx = (playerIndex !== undefined) ? playerIndex : this.leaderIndex;
    return this.drawPlayerCards(idx, count);
  }

  /**
   * 指定インデックスの次の生存プレイヤーのインデックスを返す
   * @param {number} currentIndex
   * @returns {number}
   */
  getNextActivePlayerIndex(currentIndex) {
    let next = (currentIndex + 1) % this.playerCount;
    let safety = 0;
    while (this.players[next].status === 'eliminated' && safety < this.playerCount) {
      next = (next + 1) % this.playerCount;
      safety++;
    }
    return next;
  }

  /**
   * 患者ケースの解決判定を行う
   * 必要アクションが揃っているスロットを解決済みとして処理する
   * @returns {Array} 解決した患者ケースの配列 [{slotIndex, card, lastProvider}]
   */
  resolvePatients() {
    const resolved = [];

    for (let i = 0; i < this.maxSlots; i++) {
      const card = this.patientSlots[i];
      if (!card) continue;

      const actions = this.slotActions[i];
      const required = card.requiredActions; // { 診察: n, エデュケーション: n, ソーシャル: n }

      let fulfilled = true;
      for (const [type, count] of Object.entries(required)) {
        if ((actions[type] || 0) < count) {
          fulfilled = false;
          break;
        }
      }

      if (fulfilled) {
        resolved.push({
          slotIndex: i,
          card: card,
          lastProvider: actions.lastProvider
        });
      }
    }

    // 解決処理
    for (const r of resolved) {
      // 投票カード付与
      if (r.lastProvider) {
        const provider = this.getPlayerById(r.lastProvider);
        if (provider) {
          provider.votingCards++;
          this.addLog(`${provider.profession.name} が投票カード取得（患者「${r.card.title}」）`);

        }
      }

      // カード報酬の結束度・病院長の評価を適用
      if (r.card.reward) {
        if (r.card.reward.cohesion) {
          this.changeCohesion(r.card.reward.cohesion);
        }
        if (r.card.reward.favor) {
          this.changeFavor(r.card.reward.favor);
        }
      }

      // 超過アクション分の結束度+0.5
      const actions = this.slotActions[r.slotIndex];
      const required = r.card.requiredActions;
      for (const [type, count] of Object.entries(required)) {
        const excess = (actions[type] || 0) - count;
        if (excess > 0) {
          for (let e = 0; e < excess; e++) {
            this.addCohesionFraction(0.5);
          }
        }
      }

      // スロットをクリア
      this.patientSlots[r.slotIndex] = null;
      this.slotActions[r.slotIndex] = {
        診察: 0, エデュケーション: 0, ソーシャル: 0, lastProvider: null
      };

      this.resolvedThisRound++;
      this.totalResolved++;
      this.addLog(`患者「${r.card.title}」が解決（今ラウンド${this.resolvedThisRound}枚, 累計${this.totalResolved}枚）`);

      // 優先患者解決チェック
      if (this.priorityPatientSlot === r.slotIndex) {
        this.priorityPatientResolved = true;
        this.addLog('優先患者が解決された！');
      }
    }

    // 解決後: スロットを左に詰める（空きスロットを埋める）
    if (resolved.length > 0) {
      this.compactSlots();
    }

    return resolved;
  }

  /**
   * 患者スロットを左に詰める。
   * 空きスロット（null）を除去し、残ったカードを左から詰め直す。
   * slotActions も連動してシフトする。
   */
  compactSlots() {
    const newSlots = [];
    const newActions = [];

    for (let i = 0; i < this.maxSlots; i++) {
      if (this.patientSlots[i] !== null) {
        newSlots.push(this.patientSlots[i]);
        newActions.push(this.slotActions[i]);
      }
    }

    // 残りを null で埋める
    while (newSlots.length < this.maxSlots) {
      newSlots.push(null);
      newActions.push({ 診察: 0, エデュケーション: 0, ソーシャル: 0, lastProvider: null });
    }

    this.patientSlots = newSlots;
    this.slotActions = newActions;

    // 優先患者スロットも再計算（左詰め後は位置が変わる）
    this.priorityPatientSlot = -1;

    const filledCount = this.patientSlots.filter(s => s !== null).length;
    this.addLog(`患者ゾーン左詰め完了（${filledCount}枚）`);
  }

  /**
   * 指定スロットの患者を即時解決する。
   * playCard/substitute で全アクション充足時に呼ばれる。
   * @param {number} slotIndex - 解決するスロットのインデックス
   * @returns {string|null} 敗北理由またはnull
   */
  resolveSlot(slotIndex) {
    const card = this.patientSlots[slotIndex];
    if (!card) return null;

    const actions = this.slotActions[slotIndex];

    // 投票カード付与 + 警戒度バーンアウト（最後の提供者が負担）
    if (actions.lastProvider) {
      const provider = this.getPlayerById(actions.lastProvider);
      if (provider) {
        const providerIdx = this.players.indexOf(provider);

        // 投票カード
        provider.votingCards++;
        this.addLog(`${provider.profession.name} が投票カード取得（患者「${card.title}」）`);

        // M-JIMU1効果: このラウンドの患者解決で投票カード+1
        if (this._extraVotingCardThisRound) {
          provider.votingCards++;
          this.addLog(`M-JIMU1ボーナス: ${provider.profession.name} に投票カード+1`);
        }

        // 警戒度バーンアウト: 解決時に最後の提供者が負担
        const alertLevel = card.alertLevel || card.alert || '通常';
        if (alertLevel === '要注意') {
          this.addLog(`要注意患者の解決: ${provider.profession.name} にバーンアウト+1`);
          this.changeBurnout(providerIdx, 1, true);
        } else if (alertLevel === '要警戒') {
          this.addLog(`要警戒患者の解決: ${provider.profession.name} にバーンアウト+2`);
          this.changeBurnout(providerIdx, 2, true);
        }
      }
    }

    // 結束度報酬: 要注意・要警戒カードの解決時に+1
    const alertLevel = card.alertLevel || card.alert || '通常';
    if (alertLevel === '要注意' || alertLevel === '要警戒') {
      this.changeCohesion(1);
      this.addLog(`${alertLevel}患者の解決: 結束度+1`);
    }

    // スロットをクリア
    this.patientSlots[slotIndex] = null;
    this.slotActions[slotIndex] = {
      診察: 0, エデュケーション: 0, ソーシャル: 0, lastProvider: null
    };

    this.resolvedThisRound++;
    this.totalResolved++;
    this.addLog(`患者「${card.title}」が即時解決（今ラウンド${this.resolvedThisRound}枚, 累計${this.totalResolved}枚）`);

    // 優先患者解決チェック（結束度ボーナスは廃止、記録のみ）
    if (this.priorityPatientSlot === slotIndex) {
      this.priorityPatientResolved = true;
    }

    return this.checkDefeat();
  }

  /**
   * 結束度レベルに応じた状態名を返す
   * @returns {string} 状態名
   */
  getCohesionLevel() {
    if (this.cohesion >= 8) return 'high';       // 高結束
    if (this.cohesion >= 5) return 'standard';   // 標準
    if (this.cohesion >= 3) return 'low';        // 低結束
    if (this.cohesion >= 1) return 'critical';   // 危機的
    return 'collapse';                           // 崩壊
  }

  // チームアクションルールは廃止
}

