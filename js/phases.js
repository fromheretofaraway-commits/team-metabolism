// phases.js - フェーズ進行ロジック
//
// 依存:
//   GameState (gameState.js) - gs として渡される
//   Actions   (actions.js)   - フェーズ3内のアクション実行
//   Cards     (data.js)      - カードユーティリティ
//   DATA, CONSTANTS           - グローバル定数
//
// 各フェーズ関数は GameState インスタンス (gs) を受け取り、
// UI側に制御を返すために結果オブジェクトまたは敗北理由文字列を返す。

const Phases = {

  // ====================================================================
  // フェーズ0: 申し送り（30秒）
  // ====================================================================

  /**
   * フェーズ0を開始する。
   * - 患者ゾーンの全カード確認（UI側）
   * - 手札種別の有無申告（UI側、チャットで処理）
   * - リーダーが優先患者を指定（UI側）
   *
   * コミュニケーション制限中は情報共有不可。
   *
   * @param {GameState} gs
   * @returns {{ type: string }}
   */
  phase0(gs) {
    gs.currentPhase = 'briefing';
    gs.addLog('--- フェーズ0: 申し送り ---');

    // 優先患者の指定解除（前ラウンドの残り）
    gs.priorityPatientSlot = -1;
    gs.priorityPatientResolved = false;

    // UI から優先患者指定を受け付ける（main.js / ui.js で処理）
    return {
      type: 'briefing',
      communicationRestricted: gs.communicationRestricted,
      timerSeconds: 30
    };
  },

  /**
   * フェーズ0完了時にリーダーが指定した優先患者を記録する。
   * @param {GameState} gs
   * @param {number} slotIndex - 優先患者のスロット番号（0-based）。-1 なら指定なし。
   */
  setPriorityPatient(gs, slotIndex) {
    if (slotIndex >= 0 && slotIndex < gs.maxSlots && gs.patientSlots[slotIndex] !== null) {
      gs.priorityPatientSlot = slotIndex;
      gs.addLog(`優先患者指定: スロット${slotIndex + 1}「${gs.patientSlots[slotIndex].title}」`);
    } else {
      gs.priorityPatientSlot = -1;
      gs.addLog('優先患者: 指定なし');
    }
  },

  // ====================================================================
  // フェーズ1: イベントフェーズ
  // ====================================================================

  /**
   * イベントデッキからカードを1枚公開し、種類に応じて処理する。
   *
   * @param {GameState} gs
   * @returns {{ type: string, card?: object, needsDecision?: boolean, peek?: Array }}
   */
  phase1(gs) {
    gs.currentPhase = 'event';
    gs.addLog('--- フェーズ1: イベントフェーズ ---');

    if (gs.eventDeck.length === 0) {
      gs.addLog('イベントデッキが空');
      return { type: 'empty' };
    }

    const card = gs.eventDeck.pop();
    gs.addLog(`イベント公開: ${card.id} 「${card.title}」`);

    if (card.isCrisis) {
      return Phases._handleCrisis(gs, card);
    } else {
      return Phases._handleNormalEvent(gs, card);
    }
  },

  /**
   * 危機カード処理。
   * - 危機マーカー+1
   * - 病院長の評価-1
   * - コミュニケーション制限フラグ ON
   * - 危機防御（根回し）で無効化判定
   *
   * @private
   */
  _handleCrisis(gs, card) {
    gs.crisisMarkerCount++;
    gs.addLog(`危機マーカー: ${gs.crisisMarkerCount}`);

    // 病院長の評価ペナルティは各危機カードの効果として個別に処理（共通ペナルティ廃止）

    // このラウンドのフェーズ3はコミュニケーション制限
    gs.communicationRestricted = true;

    // 危機カードの効果は要判断（UIで選択肢を表示する）
    return {
      type: 'crisis',
      card,
      needsDecision: true,
      timerSeconds: 60   // カウントダウンタイマー
    };
  },

  /**
   * 通常イベント処理。自動処理と要判断に分岐する。
   * @private
   */
  _handleNormalEvent(gs, card) {
    // 自動処理イベント
    const autoIds = [
      'E05', 'E06', 'E08', 'E11', 'E16', 'E17', 'E18', 'E20'
    ];
    // 要判断イベント
    const decisionIds = [
      'E02', 'E10', 'E14', 'E19'
    ];

    if (autoIds.includes(card.id)) {
      Phases.applyEventEffect(gs, card);
      return { type: 'auto_event', card, timerSeconds: 30 };
    } else if (decisionIds.includes(card.id)) {
      return { type: 'decision_event', card, needsDecision: true, timerSeconds: 60 };
    }

    // 未分類: 安全に自動処理として扱う
    Phases.applyEventEffect(gs, card);
    return { type: 'auto_event', card, timerSeconds: 30 };
  },

  // ------------------------------------------------------------------
  // イベント効果の適用（自動処理イベント用）
  // ------------------------------------------------------------------

  /**
   * イベントカードの効果をゲーム状態に反映する。
   * @param {GameState} gs
   * @param {object} card
   */
  applyEventEffect(gs, card) {
    const handler = Phases._eventHandlers[card.id];
    if (handler) {
      handler(gs, card);
    } else {
      gs.addLog(`${card.id}: 効果処理なし（未実装）`);
    }
  },

  /** @private イベントID別ハンドラ */
  _eventHandlers: {

    'E05': (gs) => {
      // 医師が指示を出さずに帰宅: 内科医は1アクションのみ
      const doctor = gs.players.find(p => p.professionId === 'R01' && p.status !== 'eliminated');
      if (doctor) {
        doctor._maxActionsThisTurn = 1;
        gs.addLog(`E05: ${doctor.profession.name}はこのフェーズで1アクションのみ`);
      } else {
        gs.addLog('E05: 内科医がいないため効果なし');
      }
    },

    'E06': (gs) => {
      // 非公式ランチMTGが生産的だった: 結束度+1、全員アクションカード1枚（個人デッキから）
      gs.changeCohesion(1);
      for (let i = 0; i < gs.players.length; i++) {
        const p = gs.players[i];
        if (p.status === 'eliminated') continue;
        const drawn = gs.drawPlayerCards(i, 1);
        p.hand.push(...drawn);
      }
      gs.addLog('E06: 結束度+1、全プレイヤーがアクションカード1枚引く');
    },

    'E08': (gs) => {
      // 週次ミーティングが形骸化: 結束度-1 + 全員の根回しカード-1
      gs.changeCohesion(-1);
      for (let i = 0; i < gs.players.length; i++) {
        if (gs.players[i].status !== 'eliminated') {
          gs.players[i].lobbyCards = Math.max(0, gs.players[i].lobbyCards - 1);
        }
      }
      gs.addLog('E08: 結束度-1、全プレーヤーが根回しカード1枚を捨てた');
    },

    'E11': (gs) => {
      // 研修医のローテーション: 結束度+1 + 患者ゾーンに1枚追加
      gs.changeCohesion(1);
      gs.addLog('E11: 結束度+1。患者ゾーンに1枚追加');

      if (gs.patientDeck.length > 0) {
        const card = gs.patientDeck.pop();
        const defeatReason = gs.pushPatientCard(card);
        if (defeatReason) return; // 敗北時は pushPatientCard 内で gameOver 設定済み
      }
    },

    'E16': (gs) => {
      // チームの評判が院内に広まる: 病院長の評価+1 + 放置ペナルティ1つ減らす
      gs.changeFavor(1);
      if (gs.penaltyZone.length > 0) {
        gs.penaltyZone.pop();
        gs.addLog('E16: 放置ペナルティ1枚回収');
      }
      gs.addLog('E16: 病院長の評価+1');
    },

    'E17': (gs) => {
      // 予算会議で発言権を得た: 全員に根回しカード2枚配布
      for (let i = 0; i < gs.players.length; i++) {
        if (gs.players[i].status !== 'eliminated') {
          gs.changeLobbyCards(i, 2);
        }
      }
      gs.addLog('E17: 全員に根回しカード×2配布');
    },

    'E18': (gs) => {
      // 他科との縄張り争い: 結束度6以上→3回目バーンアウトなし、5以下→アクション-1
      if (gs.cohesion >= 6) {
        gs._noBurnoutOn3rdAction = true;
        gs.addLog('E18: 結束度6以上 → 3回目アクションのバーンアウト上昇なし');
      } else {
        gs._actionPenaltyThisRound = true;
        gs.addLog('E18: 結束度5以下 → 全プレーヤーのアクション-1');
      }
    },

    'E20': (gs) => {
      // 医療安全委員会からの指摘: 病院長の評価6以上→全員カード1枚引く、5以下→全員1枚捨て
      if (gs.hospitalFavor >= 6) {
        for (let i = 0; i < gs.players.length; i++) {
          if (gs.players[i].status !== 'eliminated') {
            const drawn = gs.drawPlayerCards(i, 1);
            gs.players[i].hand.push(...drawn);
          }
        }
        gs.addLog('E20: 評価6以上 → 全員カード1枚引く');
      } else {
        // 各プレイヤーが1枚捨てる（プロトタイプではランダムに1枚捨てる）
        for (const p of gs.players) {
          if (p.status !== 'eliminated' && p.hand.length > 0) {
            const idx = Math.floor(Math.random() * p.hand.length);
            gs.discardPile.push(p.hand.splice(idx, 1)[0]);
          }
        }
        gs.addLog('E20: 評価5以下 → 全員カード1枚捨て');
      }
    }
  },

  // ------------------------------------------------------------------
  // 要判断イベントの効果適用（UI側の選択結果を受けて呼ばれる）
  // ------------------------------------------------------------------

  /**
   * 要判断イベントの効果を適用する。
   * @param {GameState} gs
   * @param {object} card - イベントカード
   * @param {object} decision - UI側で収集した選択結果
   * @returns {string|null} 敗北理由またはnull
   */
  applyDecisionEvent(gs, card, decision) {
    const handler = Phases._decisionEventHandlers[card.id];
    if (handler) {
      return handler(gs, decision) || null;
    }
    gs.addLog(`${card.id}: 要判断イベント処理なし（未実装）`);
    return null;
  },

  /** @private 要判断イベントID別ハンドラ */
  _decisionEventHandlers: {
    'E02': (gs, decision) => {
      // 申し送りの記録が不完全: 全プレイヤーが手札1枚を捨てる（プロトタイプではランダム）
      for (const p of gs.players) {
        if (p.status === 'eliminated' || p.hand.length === 0) continue;
        const idx = Math.floor(Math.random() * p.hand.length);
        gs.discardPile.push(p.hand.splice(idx, 1)[0]);
      }
      gs.addLog('E02: 全プレイヤーが手札1枚を捨てた');
    },

    'E10': (gs, decision) => {
      // 人気職種が他部署に引き抜かれそう
      const leader = gs.players[gs.leaderIndex];
      if (leader.lobbyCards >= 3) {
        leader.lobbyCards -= 3;
        gs.addLog('E10: リーダーが根回しカード3枚を捨てた');
      } else {
        // 根回し不足 → 対象選択が必要（decision.targetPlayerId で指定）
        if (decision.targetPlayerId) {
          const target = gs.getPlayerById(decision.targetPlayerId);
          if (target) {
            const targetIndex = gs.players.indexOf(target);
            gs.changeBurnout(targetIndex, 3);
            gs.addLog(`E10: ${target.profession.name}にバーンアウト+3`);
          }
        } else {
          gs.addLog('E10: 対象未指定のため効果なし');
        }
      }
    },

    'E14': (gs, decision) => {
      // 管理職への昇進オファー: リーダーが受諾するか選択
      // decision: { accepted: boolean }
      if (decision.accepted) {
        const leader = gs.players[gs.leaderIndex];
        leader.votingCards += 3;
        leader.promotionAccepted = true;
        gs.addLog('E14: リーダーが昇進を受諾 → VP+3、以降アクション-1');
      } else {
        gs.addLog('E14: リーダーが昇進を辞退');
      }
    },

    'E19': (gs, decision) => {
      // 病院長が視察に来た: 結束度8以上なら評価+2、3以下なら評価-2、それ以外は効果なし
      gs.addLog(`E19: 病院長が視察。現在の結束度=${gs.cohesion}`);
      if (gs.cohesion >= 8) {
        gs.changeFavor(2);
        gs.addLog('E19: 結束度8以上 → 病院長の評価+2');
      } else if (gs.cohesion <= 3) {
        const result = gs.changeFavor(-2);
        gs.addLog('E19: 結束度3以下 → 病院長の評価-2');
        if (result) return result;
      } else {
        gs.addLog('E19: 結束度4〜7 → 効果なし');
      }
    }
  },

  // ------------------------------------------------------------------
  // 危機カード効果の適用（UI側の選択結果を受けて呼ばれる）
  // ------------------------------------------------------------------

  /**
   * 危機カードの効果を適用する。
   * @param {GameState} gs
   * @param {object} card - 危機カード
   * @param {object} decision - UI側で収集した選択結果
   * @returns {string|null} 敗北理由またはnull
   */
  applyCrisisEffect(gs, card, decision) {
    const handler = Phases._crisisHandlers[card.id];
    if (handler) {
      return handler(gs, decision) || null;
    }
    gs.addLog(`${card.id}: 危機カード処理なし（未実装）`);
    return null;
  },

  /** @private 危機カードID別ハンドラ */
  _crisisHandlers: {
    'C01': (gs, decision) => {
      // ◯◯さん、これもよろしく（病院長の評価-1）
      gs.changeFavor(-1);
      // リーダーが指名したプレイヤーのBN+3
      if (decision.targetPlayerIds && decision.targetPlayerIds.length > 0) {
        const target = gs.getPlayerById(decision.targetPlayerIds[0]);
        if (target) {
          const idx = gs.players.indexOf(target);
          const result = gs.changeBurnout(idx, 3, true);
          gs.addLog(`C01: ${target.profession.name}にバーンアウト+3`);
          if (result) return result;
        }
      }
    },

    'C04': (gs, decision) => {
      // 慢性的な人手不足（病院長の評価-1）: 全員BN+2
      gs.changeFavor(-1);
      gs.addLog('C04: 全プレイヤーのバーンアウト+2');
      for (let i = 0; i < gs.players.length; i++) {
        if (gs.players[i].status === 'eliminated') continue;
        const result = gs.changeBurnout(i, 2, true);
        if (result) return result;
      }
    },

    'C05': (gs, decision) => {
      // 院内政治の暴走（病院長の評価-1）
      // 選択: 全員の根回しカードを消費して評価+2、または評価-4
      gs.changeFavor(-1);
      if (decision.accepted) {
        // 全員の根回しカードを消費して評価+2
        for (const p of gs.players) {
          if (p.status === 'eliminated') continue;
          gs.addLog(`C05: ${p.profession.name}の根回しカード${p.lobbyCards}枚を消費`);
          p.lobbyCards = 0;
        }
        gs.changeFavor(2);
        gs.addLog('C05: 全員の根回しカードを消費 → 病院長の評価+2');
      } else {
        // 拒否: 評価-4
        const result = gs.changeFavor(-4);
        gs.addLog('C05: 根回し消費を拒否 → 病院長の評価-4');
        if (result) return result;
      }
    },

    'C06': (gs, decision) => {
      // 燃え尽き症候群（病院長の評価-1）: リーダーの左隣がこのターン行動不可
      gs.changeFavor(-1);
      const leaderIdx = gs.leaderIndex;
      const leftIdx = (leaderIdx - 1 + gs.playerCount) % gs.playerCount;
      const target = gs.players[leftIdx];
      if (target && target.status !== 'eliminated') {
        target._skipThisTurn = true;
        gs.addLog(`C06: ${target.profession.name}（リーダーの左隣）はこのターン行動できない`);
      }
    }
  },

  // ====================================================================
  // フェーズ2: 患者ケースフェーズ
  // ====================================================================

  /**
   * ラウンドに応じた枚数の患者ケースカードをスロットに追加する。
   * 結束度1〜2の場合、スロット末尾を強制押し出し。
   *
   * @param {GameState} gs
   * @returns {string|null} 敗北理由またはnull
   */
  phase2(gs) {
    gs.currentPhase = 'patient';
    gs.addLog('--- フェーズ2: 患者ケースフェーズ ---');

    const addCount = gs.getPatientAddCount();
    gs.addLog(`ラウンド${gs.round}: ${addCount}枚追加`);

    for (let i = 0; i < addCount; i++) {
      if (gs.patientDeck.length === 0) {
        gs.addLog('患者デッキが空');
        break;
      }
      const card = gs.patientDeck.pop();
      const defeatReason = gs.pushPatientCard(card);
      if (defeatReason) return defeatReason;
    }

    return gs.checkDefeat();
  },

  // ====================================================================
  // フェーズ3: アクションフェーズ（開始・ターン管理）
  // ====================================================================

  /**
   * アクションフェーズを開始する。
   * ターン順序をスタートプレイヤーから設定する。
   *
   * @param {GameState} gs
   * @returns {{ type: string, firstPlayerIndex: number }}
   */
  phase3Start(gs) {
    gs.currentPhase = 'action';
    gs.addLog('--- フェーズ3: アクションフェーズ ---');

    // 全員パスのトリアージ管理用
    gs._allPassedOnce = false;

    return {
      type: 'action_start',
      firstPlayerIndex: gs.startPlayerIndex,
      timerSecondsPerTurn: 90
    };
  },

  /**
   * プレイヤーのターンを開始する。
   * ステップA: カード補充（1枚自動追加、上限7枚超過時は1枚捨て）
   *
   * @param {GameState} gs
   * @param {number} playerIndex
   * @returns {{ type: string, drawnCard?: object, needsDiscard?: boolean }}
   */
  startPlayerTurn(gs, playerIndex) {
    const player = gs.players[playerIndex];

    // 一時離席中のプレイヤーはスキップ
    if (player.leaveRoundsRemaining > 0) {
      gs.addLog(`${player.profession.name}: 一時離席中のためスキップ`);
      return { type: 'skip_leave' };
    }

    // 脱落プレイヤーはスキップ
    if (player.status === 'eliminated') {
      return { type: 'skip_eliminated' };
    }

    // C06「燃え尽き症候群」: このターン行動不可
    if (player._skipThisTurn) {
      player._skipThisTurn = false;
      gs.addLog(`${player.profession.name}: 燃え尽き症候群によりこのターン行動不可`);
      return { type: 'skip_burnout' };
    }

    // ターン内フラグリセット
    gs.startTurn(playerIndex);

    // E18 効果: 結束度5以下 → 全プレーヤーのアクション-1
    if (gs._actionPenaltyThisRound) {
      player.actionsRemaining = Math.max(0, player.actionsRemaining - 1);
    }

    // E05 効果: 内科医の1アクション制限
    if (player._maxActionsThisTurn !== undefined) {
      player.actionsRemaining = Math.min(player.actionsRemaining, player._maxActionsThisTurn);
      delete player._maxActionsThisTurn;
    }

    // C04 効果: 閾値超過者はアクション-1
    if (player._actionPenaltyThisTurn) {
      player.actionsRemaining = Math.max(0, player.actionsRemaining - 1);
      player._actionPenaltyThisTurn = false;
    }

    player._cardPlayedThisTurn = false;

    // ステップA: カード補充（CARDS_DRAWN_PER_TURN枚、個人デッキから）
    const drawCount = CONSTANTS.CARDS_DRAWN_PER_TURN || 1;
    let drawnCard = null;
    let needsDiscard = false;
    const drawn = gs.drawPlayerCards(playerIndex, drawCount);
    if (drawn.length > 0) {
      player.hand.push(...drawn);
      drawnCard = drawn[0]; // 互換性のため最初の1枚を保持
      const names = drawn.map(c => c.title || c.id).join('」「');
      gs.addLog(`${player.profession.name}: アクションカード${drawn.length}枚補充「${names}」`);
    }

    // 手札上限チェック（MAX_HAND_SIZE枚）
    if (player.hand.length > CONSTANTS.MAX_HAND_SIZE) {
      needsDiscard = true;
      gs.addLog(`${player.profession.name}: 手札${player.hand.length}枚 → ${player.hand.length - CONSTANTS.MAX_HAND_SIZE}枚捨てる必要あり`);
    }

    return {
      type: 'turn_start',
      playerIndex,
      drawnCard,
      needsDiscard,
      actionsRemaining: player.actionsRemaining
    };
  },

  /**
   * 手札上限超過時に1枚捨てる。
   * @param {GameState} gs
   * @param {number} playerIndex
   * @param {number} cardIndex - 捨てるカードのインデックス
   */
  discardExcess(gs, playerIndex, cardIndex) {
    const player = gs.players[playerIndex];
    if (cardIndex >= 0 && cardIndex < player.hand.length) {
      const card = player.hand.splice(cardIndex, 1)[0];
      gs.discardPile.push(card);
      gs.addLog(`${player.profession.name}: 「${card.title || card.id}」を捨てた`);
    }
  },

  /**
   * 全員パス時のトリアージ判定を処理する。
   * @param {GameState} gs
   * @param {number} slotIndex - リーダーが選択した患者スロット
   * @returns {string|null} 敗北理由またはnull
   */
  handleTriage(gs, slotIndex) {
    if (gs.triageUsedThisRound) {
      gs.addLog('トリアージは1ラウンド1回まで。アクションフェーズ終了');
      return null;
    }

    gs.triageUsedThisRound = true;
    const card = gs.patientSlots[slotIndex];
    if (!card) {
      gs.addLog('指定スロットに患者がいない');
      return null;
    }

    // 患者を放置ペナルティゾーンへ
    gs.patientSlots[slotIndex] = null;
    gs.slotActions[slotIndex] = {
      診察: 0, エデュケーション: 0, ソーシャル: 0, lastProvider: null
    };
    gs.addLog(`トリアージ: 「${card.title}」を対応不能として放置ペナルティゾーンへ`);

    const penaltyResult = gs.addPenaltyCard(card);
    if (penaltyResult) return penaltyResult;

    // 結束度ペナルティ（トリアージ）
    const cohResult = gs.changeCohesion(-CONSTANTS.COHESION_PENALTY_TRIAGE);
    if (cohResult) return cohResult;

    // 全プレイヤーにアクションカード1枚（個人デッキから）
    for (let i = 0; i < gs.players.length; i++) {
      const p = gs.players[i];
      if (p.status === 'eliminated') continue;
      const drawn = gs.drawPlayerCards(i, 1);
      p.hand.push(...drawn);
    }
    gs.addLog('トリアージ: 全プレイヤーがアクションカード1枚引く');

    return gs.checkDefeat();
  },

  // ====================================================================
  // フェーズ4: 患者ケース解決フェーズ
  // ====================================================================

  /**
   * 患者ケースの解決判定を行う。
   * GameState.resolvePatients() に委譲し、職種パッシブによる免除を事前に適用する。
   *
   * @param {GameState} gs
   * @returns {{ resolved: Array, defeatReason: string|null }}
   */
  phase4(gs) {
    gs.currentPhase = 'resolve';
    gs.addLog('--- フェーズ4: 患者ケース解決フェーズ ---');

    // 職種パッシブによる免除をスロットアクションに事前反映
    // パッシブスキル廃止のため免除処理なし

    // C04 効果: 解決数制限
    const resolveReduction = gs._resolveReduction || 0;

    // GameState の解決処理を実行
    const resolved = gs.resolvePatients();

    // C04 効果適用: 解決数-1（最後に解決したものを取り消し）
    if (resolveReduction > 0 && resolved.length > resolveReduction) {
      // 既に resolvePatients() 内で処理済みのため、ここでは解決数の記録のみ調整
      // （プロトタイプでは簡略化: ログのみ）
      gs.addLog(`C04効果: 患者ケース解決数-${resolveReduction}（実質${resolved.length - resolveReduction}枚解決）`);
    }

    gs.addLog(`このラウンドの解決数: ${gs.resolvedThisRound} / 累計: ${gs.totalResolved}`);

    const defeatReason = gs.checkDefeat();
    return { resolved, defeatReason, timerSeconds: 60 };
  },

  /**
   * 職種パッシブによるアクション免除をスロットアクションに反映する。
   * 解決判定の直前に1回だけ呼ばれる。
   * @private
   */
  _applyPassiveExemptions(gs) {
    for (let i = 0; i < gs.maxSlots; i++) {
      const patient = gs.patientSlots[i];
      if (!patient) continue;

      const tags = patient.tags || [];
      const required = patient.requiredActions || {};
      const actions = gs.slotActions[i];
      const effectiveSlots = gs.slotsReduced ? gs.maxSlots - 1 : gs.maxSlots;

      for (const p of gs.players) {
        if (p.status === 'eliminated') continue;

        switch (p.professionId) {
          case 'R01': {
            // 内科医パッシブ1: 必要アクション1つ免除（1ラウンド1回）
            if (!p.passiveUsedThisRound && p.status !== 'exhausted') {
              // 最も不足しているアクション種別を1つ免除
              let bestType = null;
              let bestDeficit = 0;
              for (const [type, count] of Object.entries(required)) {
                const deficit = count - (actions[type] || 0);
                if (deficit > 0 && deficit > bestDeficit) {
                  bestDeficit = deficit;
                  bestType = type;
                }
              }
              if (bestType) {
                actions[bestType] = (actions[bestType] || 0) + 1;
                p.passiveUsedThisRound = true;
                gs.addLog(`内科医パッシブ: スロット${i + 1}の${bestType}を1つ免除`);
              }
            }
            break;
          }

          case 'R02': {
            // 看護師パッシブ1: スロット6・7の必要アクション1つ免除（1ラウンド1回）
            const slotNum = i + 1;
            if (!p.passiveUsedThisRound && p.status !== 'exhausted' &&
                (slotNum === 6 || slotNum === 7 || slotNum === effectiveSlots || slotNum === effectiveSlots - 1)) {
              let bestType = null;
              let bestDeficit = 0;
              for (const [type, count] of Object.entries(required)) {
                const deficit = count - (actions[type] || 0);
                if (deficit > 0 && deficit > bestDeficit) {
                  bestDeficit = deficit;
                  bestType = type;
                }
              }
              if (bestType) {
                actions[bestType] = (actions[bestType] || 0) + 1;
                p.passiveUsedThisRound = true;
                gs.addLog(`看護師パッシブ: スロット${slotNum}の${bestType}を1つ免除`);
              }
            }

            // 看護師スキル「緊急対応体制」: スロット5〜7の必要アクション2つ免除
            if (gs._nurseEmergencyActive && slotNum >= 5 && slotNum <= 7) {
              let exempted = 0;
              for (const [type, count] of Object.entries(required)) {
                if (exempted >= 2) break;
                const deficit = count - (actions[type] || 0);
                if (deficit > 0) {
                  const apply = Math.min(deficit, 2 - exempted);
                  actions[type] = (actions[type] || 0) + apply;
                  exempted += apply;
                }
              }
              if (exempted > 0) {
                gs.addLog(`看護師スキル: スロット${slotNum}の必要アクション${exempted}つ免除`);
              }
            }
            break;
          }

          case 'R03': {
            // 管理栄養士パッシブ1: 生活習慣介入タグで1つ免除
            if (p.status !== 'exhausted' && tags.includes('生活習慣介入')) {
              if (!p._dietPassiveUsedSlot || p._dietPassiveUsedSlot !== i) {
                const deficit = (required['エデュケーション'] || 0) - (actions['エデュケーション'] || 0);
                if (deficit > 0) {
                  actions['エデュケーション'] = (actions['エデュケーション'] || 0) + 1;
                  p._dietPassiveUsedSlot = i;
                  gs.addLog(`管理栄養士パッシブ: スロット${i + 1}のエデュケーションを1つ免除`);
                }
              }
            }
            break;
          }

          case 'R05': {
            // 理学療法士パッシブ1: 運動療法タグで必要アクション半減
            if (p.status !== 'exhausted' && tags.includes('運動療法')) {
              for (const [type, count] of Object.entries(required)) {
                const halved = Math.ceil(count / 2);
                const exemption = count - halved;
                if (exemption > 0) {
                  actions[type] = (actions[type] || 0) + exemption;
                }
              }
              gs.addLog(`理学療法士パッシブ: スロット${i + 1}の運動療法患者の必要アクション半減`);
            }
            break;
          }

          // R06: MSWは選択不可（マネジメントカード化済み）

          case 'R07': {
            // 臨床心理士パッシブ1: 精神的支援・アドヒアランスタグで1つ免除
            if (p.status !== 'exhausted' && (tags.includes('精神的支援') || tags.includes('アドヒアランス'))) {
              const deficit = (required['ソーシャル'] || 0) - (actions['ソーシャル'] || 0);
              if (deficit > 0) {
                actions['ソーシャル'] = (actions['ソーシャル'] || 0) + 1;
                gs.addLog(`臨床心理士パッシブ: スロット${i + 1}のソーシャルを1つ免除`);
              }
            }
            break;
          }
        }
      }
    }

    // スキルフラグリセット
    gs._nurseEmergencyActive = false;
  },

  // ====================================================================
  // フェーズ5: ラウンド終了処理
  // ====================================================================

  /**
   * ラウンド終了処理を実行する。
   * GameState.processRoundEnd() に委譲し、C05の根回し補充停止を反映する。
   *
   * @param {GameState} gs
   * @returns {{ type: string, defeatReason?: string, victory?: boolean }}
   */
  phase5(gs) {
    gs.currentPhase = 'end';
    gs.addLog('--- フェーズ5: ラウンド終了処理 ---');

    // C05 効果: 根回し補充停止フラグを確認
    const lobbyRefillStopped = gs._lobbyRefillStopped || false;

    // processRoundEnd の処理を実行
    const defeatReason = gs.processRoundEnd();

    // C05 効果: 根回し補充停止の場合、補充分を取り消す
    // （processRoundEnd 内で既に補充済みのため、後から引く）
    if (lobbyRefillStopped) {
      for (let i = 0; i < gs.players.length; i++) {
        const p = gs.players[i];
        if (p.status === 'eliminated') continue;
        let refund = 1;
        if (gs.hospitalFavor >= 10) refund += 2;
        else if (gs.hospitalFavor >= 8) refund += 1;
        p.lobbyCards = Math.max(0, p.lobbyCards - refund);
      }
      gs.addLog('C05効果: 根回しカード補充を取り消し');
      gs._lobbyRefillStopped = false;
    }

    if (defeatReason) {
      return { type: 'defeat', defeatReason };
    }

    // ゲーム終了判定（8ラウンド目のフェーズ5完了後、round=9になっている）
    if (gs.round > CONSTANTS.ROUNDS) {
      // 無名の患者ケースカード2枚を追加（最後の圧力）
      for (let extra = 0; extra < 2; extra++) {
        const anonymousPatient = {
          id: `ANON${extra + 1}`, title: "無名の患者", category: "緊急",
          tags: [], requiredActions: { 診察: 1, エデュケーション: 1, ソーシャル: 1 },
          rewardVP: 0, rewardOther: "", alert: "要注意"
        };
        const defeatResult = gs.pushPatientCard(anonymousPatient);
        gs.addLog(`終了時追加: 無名の患者カード（${extra + 1}/2枚目）`);
        if (defeatResult) {
          return { type: 'defeat', defeatReason: defeatResult };
        }
      }

      const won = gs.checkVictory();
      return { type: 'game_end', victory: won };
    }

    // ラウンド内フラグリセット
    gs._resolveReduction = 0;
    gs._actionPenaltyThisRound = false;
    gs._noBurnoutOn3rdAction = false;
    gs._rewardMultiplier = 1;

    // 次のラウンド開始
    gs.startRound();

    if (gs.gameOver) {
      return { type: 'defeat', defeatReason: gs.gameOverReason };
    }

    return { type: 'next_round', round: gs.round };
  },

  // ====================================================================
  // NPC自動処理（3人プレイ用）
  // ====================================================================

  /**
   * フェーズ3終了後にNPCのアクションを自動処理する。
   * アクションデッキから1枚引き、適用可能な患者ケースがあれば自動適用。
   * @param {GameState} gs
   */
  processNpcActions(gs) {
    if (!gs.isNpcGame || gs.npcs.length === 0) return;

    for (const npc of gs.npcs) {
      if (!npc.actionDeck || npc.actionDeck.length === 0) break;
      const card = npc.actionDeck.pop();
      const actionType = card.type;

      if (actionType === 'マネジメント') {
        gs.discardPile.push(card);
        gs.addLog(`NPC(${npc.name}): マネジメントカードを引いたが適用先なし → 捨て札`);
        continue;
      }

      // 適用可能な患者を探す（最もスロット番号が大きい=押し出しが近い患者を優先）
      let bestSlot = -1;
      const effectiveSlots = gs.slotsReduced ? gs.maxSlots - 1 : gs.maxSlots;
      for (let i = effectiveSlots - 1; i >= 0; i--) {
        const patient = gs.patientSlots[i];
        if (!patient) continue;
        const req = patient.requiredActions[actionType] || 0;
        const have = gs.slotActions[i][actionType] || 0;
        if (req > have) {
          bestSlot = i;
          break;
        }
      }

      if (bestSlot >= 0) {
        gs.slotActions[bestSlot][actionType] = (gs.slotActions[bestSlot][actionType] || 0) + 1;
        gs.discardPile.push(card);
        gs.addLog(`NPC(${npc.name}): 「${card.title}」(${actionType}) → スロット${bestSlot + 1}「${gs.patientSlots[bestSlot].title}」`);
      } else {
        gs.discardPile.push(card);
        gs.addLog(`NPC(${npc.name}): 「${card.title}」適用先なし → 捨て札`);
      }
    }
  },

  // ====================================================================
  // ゲーム終了処理
  // ====================================================================

  /**
   * VP 集計を行い、個人順位を決定する。
   * チーム勝利時のみ呼ばれる。
   *
   * @param {GameState} gs
   * @param {object} votes - { [receiverPlayerId]: number } 各プレイヤーが受け取った投票カード数
   * @returns {Array<{ playerId: string, professionName: string, vp: number, breakdown: object }>}
   */
  calculateFinalVP(gs, votes) {
    const results = [];

    for (const p of gs.players) {
      const votesReceived = votes[p.id] || 0;
      let missionVP = 0;

      // 秘密ミッション達成判定（プロトタイプでは手動 / プレイログベース）
      if (p.secretMission && p.secretMission.achieved) {
        missionVP = p.secretMission.vp || 0;
      }

      // E14 昇進VP
      const promotionVP = p.promotionAccepted ? 3 : 0;

      const totalVP = votesReceived + missionVP + promotionVP;

      results.push({
        playerId: p.id,
        professionName: p.profession ? p.profession.name : p.professionId,
        vp: totalVP,
        breakdown: {
          votesReceived,
          missionVP,
          promotionVP
        }
      });
    }

    // VP降順でソート
    results.sort((a, b) => b.vp - a.vp);

    // MVP判定
    if (results.length > 0) {
      results[0].isMVP = true;
      gs.addLog(`MVP: ${results[0].professionName}（${results[0].vp}VP）`);
    }

    return results;
  }
};
