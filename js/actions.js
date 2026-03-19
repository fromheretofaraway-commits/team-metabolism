// actions.js - アクション処理
//
// 依存:
//   GameState (gameState.js) - gs として渡される
//   DATA, CONSTANTS           - グローバル定数
//
// フェーズ3で使用するアクション＋補助操作を提供する。
// 各関数は { success: boolean, reason?: string, ...追加データ } を返す。

const Actions = {

  // ====================================================================
  // 1. アクションカードをプレイする
  // ====================================================================

  /**
   * 手札のアクションカードを患者ケースに使用する。
   * - 診察/エデュケーション/ソーシャル: 患者ケースに使用可能
   * - マネジメント: playManagementCard() に委譲
   *
   * @param {GameState} gs
   * @param {number} playerIndex
   * @param {number} cardIndex - 手札内のインデックス
   * @param {number} targetSlot - 患者ゾーンのスロット番号（0-based）
   * @returns {{ success: boolean, reason?: string }}
   */
  playCard(gs, playerIndex, cardIndex, targetSlot) {
    const player = gs.players[playerIndex];

    // --- バリデーション ---
    if (player.status === 'eliminated') {
      return { success: false, reason: '脱落済み' };
    }
    if (player.actionsRemaining <= 0) {
      return { success: false, reason: '残りアクションなし' };
    }
    if (cardIndex < 0 || cardIndex >= player.hand.length) {
      return { success: false, reason: 'カードが見つからない' };
    }

    const card = player.hand[cardIndex];

    // マネジメントカードは患者ケースには使えない
    const actionType = card.actionType || card.type; // 診察 / エデュケーション / ソーシャル / マネジメント
    if (actionType === 'マネジメント') {
      return Actions.playManagementCard(gs, playerIndex, cardIndex);
    }

    // 患者の存在チェック
    if (targetSlot < 0 || targetSlot >= gs.maxSlots) {
      return { success: false, reason: '無効なスロット番号' };
    }
    const patient = gs.patientSlots[targetSlot];
    if (!patient) {
      return { success: false, reason: 'そのスロットに患者がいない' };
    }

    // C01 効果: スロット数減少時の範囲チェック
    if (gs.slotsReduced && targetSlot >= gs.maxSlots - 1) {
      return { success: false, reason: 'スロット減少により使用不可' };
    }

    // --- カード消費バリデーション ---
    const required = patient.requiredActions[actionType] || 0;
    const provided = gs.slotActions[targetSlot][actionType] || 0;
    if (required <= 0) {
      return { success: false, reason: `この患者には${actionType}は必要ありません` };
    }
    if (provided >= required) {
      return { success: false, reason: `${actionType}は既に必要数(${required})を満たしています` };
    }

    // E23 効果: 加算タグのカードは追加確認が必要（フレーバー処理）
    // R08は選択不可のためマネジメントカード化済み

    // 警戒度バーンアウトは解決時に最後の提供者に発生する（resolveSlotで処理）
    // アクション提供時には発生しない

    // --- アクション提供 ---
    gs.slotActions[targetSlot][actionType] = (gs.slotActions[targetSlot][actionType] || 0) + 1;
    gs.slotActions[targetSlot].lastProvider = player.id;

    // 手札から除去・捨て札へ
    player.hand.splice(cardIndex, 1);
    gs.discardPile.push(card);

    // コスト消費
    Actions._consumeAction(gs, playerIndex);
    player._cardPlayedThisTurn = true;

    gs.addLog(
      `${player.profession.name}: 「${card.title || card.id}」(${actionType})` +
      ` → スロット${targetSlot + 1}「${patient.title}」`
    );

    // --- 即時解決チェック ---
    if (gs.patientSlots[targetSlot]) {
      const fulfilled = Actions._checkFulfilled(gs, targetSlot);
      if (fulfilled) {
        gs.resolveSlot(targetSlot);
        gs.compactSlots();
      }
    }

    return { success: true };
  },

  // ====================================================================
  // 2. 根回しカードを使う
  // ====================================================================

  /**
   * 根回しカードを1枚消費して効果を発動する。
   *
   * @param {GameState} gs
   * @param {number} playerIndex
   * @param {string} effect - 'a'病院長の評価ロール / 'c'情報偵察 / 'd'アクション委譲 / 'e'バーンアウト緩和
   * @param {number} [targetIndex] - 'd','e'で必要な対象プレイヤーのインデックス
   * @returns {{ success: boolean, reason?: string, roll?: number, peek?: Array }}
   */
  useLobbyCard(gs, playerIndex, effect, targetIndex) {
    const player = gs.players[playerIndex];

    if (player.status === 'eliminated') return { success: false, reason: '脱落済み' };
    if (player.actionsRemaining <= 0) return { success: false, reason: '残りアクションなし' };
    if (player.lobbyCards <= 0) return { success: false, reason: '根回しカードなし' };

    // MSWパッシブ2: 廃止（R06はマネジメントカード化）
    const mswDouble = false;

    // 消費・コスト
    player.lobbyCards--;
    Actions._consumeAction(gs, playerIndex);

    switch (effect) {
      case 'a': {
        // 病院長の評価アップ: 確定+1（ダイス判定なし）
        gs.changeFavor(1);
        gs.addLog(`${player.profession.name}: 病院長の評価アップ（確定+1）`);
        return { success: true };
      }

      // 情報偵察(c)は廃止

      case 'd': {
        // アクション委譲: 他プレイヤー1名のアクション+1
        if (targetIndex === undefined || targetIndex === playerIndex) {
          player.lobbyCards++;
          player.actionsRemaining++;
          player.actionsUsedThisRound--;
          return { success: false, reason: '対象プレイヤーを指定してください（自分以外）' };
        }
        const target = gs.players[targetIndex];
        if (!target || target.status === 'eliminated') {
          player.lobbyCards++;
          player.actionsRemaining++;
          player.actionsUsedThisRound--;
          return { success: false, reason: '有効な対象プレイヤーを指定してください' };
        }

        const gain = mswDouble ? 2 : 1;
        target.actionsRemaining += gain;
        gs.addLog(`${player.profession.name} → ${target.profession.name}: アクション+${gain}`);
        return { success: true };
      }

      case 'e': {
        // バーンアウト緩和: 他プレイヤー1名のバーンアウト-1
        if (targetIndex === undefined) {
          player.lobbyCards++;
          player.actionsRemaining++;
          player.actionsUsedThisRound--;
          return { success: false, reason: '対象プレイヤーを指定してください' };
        }
        const target = gs.players[targetIndex];
        if (!target || target.status === 'eliminated') {
          player.lobbyCards++;
          player.actionsRemaining++;
          player.actionsUsedThisRound--;
          return { success: false, reason: '有効な対象プレイヤーを指定してください' };
        }

        const reduction = mswDouble ? 2 : 1;
        gs.changeBurnout(targetIndex, -reduction, true);
        gs.addLog(`${player.profession.name} → ${target.profession.name}: バーンアウト-${reduction}`);
        return { success: true };
      }

      default: {
        // 不明な効果: 返却
        player.lobbyCards++;
        player.actionsRemaining++;
        player.actionsUsedThisRound--;
        return { success: false, reason: `不明な根回し効果: ${effect}` };
      }
    }
  },

  // ====================================================================
  // 3. 職種固有スキルを使用する（1ゲーム1回）
  // ====================================================================

  /**
   * 職種固有スキルを発動する。
   * confirmed が false の場合は確認情報のみ返す。
   *
   * @param {GameState} gs
   * @param {number} playerIndex
   * @param {object} [options] - スキルによっては追加情報が必要
   *   R05: { targetIndex: number }
   *   confirmed: true で実際に発動
   * @returns {{ success: boolean, reason?: string, needsConfirmation?: boolean, needsTarget?: boolean, effect?: string, drawnCards?: Array }}
   */
  useSkill(gs, playerIndex, options) {
    const player = gs.players[playerIndex];

    if (player.status === 'eliminated') return { success: false, reason: '脱落済み' };
    if (player.actionsRemaining <= 0) return { success: false, reason: '残りアクションなし' };
    if (player.skillUsed) return { success: false, reason: '固有スキル使用済み（1ゲーム1回）' };
    if (player.reduced) return { success: false, reason: 'C02効果: 縮小状態では固有スキル使用不可' };
    if (player.motivationLow) return { success: false, reason: 'C06効果: モチベーション低下状態では固有スキル使用不可' };

    // 確認ステップ
    if (!options || !options.confirmed) {
      return {
        success: false,
        needsConfirmation: true,
        skillName: player.profession.skillName,
        skillEffect: player.profession.skillEffect
      };
    }

    player.skillUsed = true;
    Actions._consumeAction(gs, playerIndex);

    gs.addLog(`${player.profession.name}: 固有スキル「${player.profession.skillName || player.professionId}」発動`);

    switch (player.professionId) {
      case 'R01': {
        // チームの船頭: 結束度8以上のときのみ使用可能
        if (gs.cohesion < 8) {
          // スキル消費を取り消し
          player.skillUsed = false;
          player.actionsRemaining++;
          player.actionsUsedThisRound = Math.max(0, player.actionsUsedThisRound - 1);
          gs.addLog('チームの船頭: 結束度8未満のため使用不可');
          return { success: false, reason: '結束度8以上のときのみ使用可能です' };
        }
        gs.changeBurnout(playerIndex, 1, true);
        gs.addLog('チームの船頭: 自身のバーンアウト+1。解決する患者スロットを選択');
        return { success: true, needsSlotTarget: true, effect: 'force_resolve' };
      }

      case 'R02': {
        // 白衣の戦士: 自身のBN+4、放置ペナルティ-1
        gs.changeBurnout(playerIndex, 4, true);
        if (gs.penaltyZone.length > 0) {
          gs.penaltyZone.pop();
          gs.addLog('白衣の戦士: 放置ペナルティ1枚回収');
        } else {
          gs.addLog('白衣の戦士: 放置ペナルティなし（回収なし）');
        }
        gs.addLog(`白衣の戦士: ${player.profession.name}のバーンアウト+4`);
        return { success: true };
      }

      case 'R03': {
        // 栄養カンファレンス: 全員バーンアウト-2（結束度8以上限定）
        if (gs.cohesion < 8) {
          gs.addLog('結束度8未満のため効果なし');
          return { success: true };
        }
        for (let i = 0; i < gs.players.length; i++) {
          if (gs.players[i].status !== 'eliminated' && gs.players[i].burnout > 0) {
            gs.changeBurnout(i, -2, true);
          }
        }
        gs.addLog('栄養カンファレンス: 全プレイヤーのバーンアウト-1');
        return { success: true };
      }

      case 'R04': {
        // 処方監査: 3枚引いて2枚選択（UIで選択が必要）
        const drawn = gs.drawPlayerCards(playerIndex, 3);
        gs.addLog(`処方監査: 3枚引き: ${drawn.map(c => c.title || c.id).join(', ')}`);
        player._drawnForSkill = drawn;
        return { success: true, needsSelection: true, drawnCards: drawn, selectCount: 2 };
      }

      case 'R05': {
        // みんなで筋トレ: アクション2回分消費。全員BN-1、結束度+1
        // スキル使用で1アクション消費済み → 追加で1アクション消費
        player.actionsRemaining = Math.max(0, player.actionsRemaining - 1);
        player.actionsUsedThisRound++;
        for (let i = 0; i < gs.players.length; i++) {
          if (gs.players[i].status !== 'eliminated' && gs.players[i].burnout > 0) {
            gs.changeBurnout(i, -1, true);
          }
        }
        gs.changeCohesion(1);
        gs.addLog('みんなで筋トレ: 全プレーヤーのバーンアウト-1、結束度+1（2アクション消費）');
        return { success: true };
      }

      case 'R06': {
        // 1 on 1: 対象プレイヤーを選択しBN-3、自身BN+1
        gs.changeBurnout(playerIndex, 1, true);
        gs.addLog('1 on 1: 自身のバーンアウト+1。対象プレイヤーを選択');
        return { success: true, needsTarget: true, effect: 'burnout-3' };
      }

      default: {
        gs.addLog(`未実装の職種スキル: ${player.professionId}`);
        return { success: true };
      }
    }
  },

  /**
   * R04（薬剤師）処方監査のカード選択を完了する。
   */
  completeSkillR04(gs, playerIndex, selectedIndices) {
    const player = gs.players[playerIndex];
    const drawn = player._drawnForSkill;
    if (!drawn || drawn.length === 0) return;
    for (let i = 0; i < drawn.length; i++) {
      if (selectedIndices.includes(i)) {
        player.hand.push(drawn[i]);
      } else {
        gs.discardPile.push(drawn[i]);
      }
    }
    const selected = selectedIndices.map(i => drawn[i].title || drawn[i].id).join(', ');
    gs.addLog(`処方監査: ${selected} を手札に追加`);
    delete player._drawnForSkill;
  },

  /**
   * R01（内科医）チームの船頭: 指定スロットの患者を強制解決する。
   */
  completeSkillR01(gs, slotIndex) {
    const patient = gs.patientSlots[slotIndex];
    if (!patient) {
      gs.addLog('チームの船頭: 無効なスロット');
      return;
    }
    gs.addLog(`チームの船頭: スロット${slotIndex + 1}「${patient.title}」を強制解決`);
    gs.resolveSlot(slotIndex);
    gs.compactSlots();
  },

  /**
   * R06（臨床心理士）1 on 1: 対象プレイヤーのBN-3。
   */
  completeSkillR06(gs, playerIndex, targetIndex) {
    const target = gs.players[targetIndex];
    if (!target || target.status === 'eliminated' || targetIndex === playerIndex) {
      gs.addLog('1 on 1: 無効な対象');
      return;
    }
    gs.changeBurnout(targetIndex, -3, true);
    gs.addLog(`1 on 1: ${target.profession.name}のバーンアウト-3`);
  },

  // ====================================================================
  // 4. マネジメントカードを使用する
  // ====================================================================

  /**
   * マネジメントカード（A51/A52/A60等）を使用する。
   * 患者ケースには使えず、チーム効果＋病院長の評価効果を発動。
   *
   * @param {GameState} gs
   * @param {number} playerIndex
   * @param {number} cardIndex
   * @returns {{ success: boolean, reason?: string, needsTarget?: boolean, effect?: string }}
   */
  playManagementCard(gs, playerIndex, cardIndex) {
    const player = gs.players[playerIndex];
    const card = player.hand[cardIndex];

    // A60 使用済みチェック
    if (card.id === 'A60' || card.id === 'A60B') {
      if (gs.a60Used) return { success: false, reason: 'A60は1ゲーム1回限定' };
    }

    // 手札から除去
    player.hand.splice(cardIndex, 1);
    gs.discardPile.push(card);
    Actions._consumeAction(gs, playerIndex);
    player._cardPlayedThisTurn = true;

    // IDからBサフィックスを除去して判定
    const baseId = card.id.replace(/B$/, '');

    switch (baseId) {
      case 'A51': {
        // 非公式の懇親会: 根回しカード×1を任意プレイヤーへ + 結束度+2
        gs.changeCohesion(2);
        gs.addLog('A51: 結束度+2。根回しカード×1を渡す相手をUIで選択');
        return { success: true, needsTarget: true, effect: 'give_lobby' };
      }

      case 'A52': {
        // 1on1面談: 任意プレイヤーのバーンアウト-1 + 自分に根回しカード×1 + 病院長の評価+1
        gs.changeLobbyCards(playerIndex, 1);
        gs.changeFavor(1);
        gs.addLog('A52: 根回しカード+1、病院長の評価+1。バーンアウト-1の対象をUIで選択');
        return { success: true, needsTarget: true, effect: 'burnout-1' };
      }

      case 'A60': {
        // 緊急チームミーティング: 1ゲーム1回限定。全員手札+2 + 作戦タイム3分 + 病院長の評価+1
        gs.a60Used = true;
        for (let pi = 0; pi < gs.players.length; pi++) {
          const p = gs.players[pi];
          if (p.status !== 'eliminated') {
            const drawn = gs.drawPlayerCards(pi, 2);
            p.hand.push(...drawn);
          }
        }
        gs.changeFavor(1);
        gs.addLog('A60: 全員手札+2、病院長の評価+1、作戦タイム3分追加');
        return { success: true, extraStrategyTime: 180 };
      }

      case 'M-MSW1': {
        // ソーシャルワーク介入: 対象スロット選択 → ソーシャル必要数-2 + 結束度+1
        gs.changeCohesion(1);
        gs.addLog('M-MSW1: 結束度+1。ソーシャル必要数を2減らすスロットをUIで選択');
        return { success: true, needsSlotTarget: true, effect: 'reduce_social_2' };
      }

      case 'M-MSW2': {
        // ステークホルダー橋渡し: 病院長の評価+2 + 全員に根回し+1
        gs.changeFavor(2);
        for (let pi = 0; pi < gs.players.length; pi++) {
          if (gs.players[pi].status !== 'eliminated') {
            gs.changeLobbyCards(pi, 1);
          }
        }
        gs.addLog('M-MSW2: 病院長の評価+2、全員に根回しカード×1配布');
        return { success: true };
      }

      case 'M-JIMU1': {
        // 診療報酬最適化: ターンを消費せずに好きな枚数カードを捨て、山札から補充
        // アクション消費は playManagementCard で既に行われているので、+1して帳消しにする
        player.actionsRemaining++;
        player.actionsUsedThisRound = Math.max(0, player.actionsUsedThisRound - 1);
        gs.addLog('M-JIMU1: ターン消費なし。捨てるカードをUIで選択');
        return { success: true, needsDiscard: true, effect: 'jimu1_refresh' };
      }

      case 'M-JIMU2': {
        // 事務力によるチーム支援: 全員に根回し+1 + 全員手札+2
        for (let pi = 0; pi < gs.players.length; pi++) {
          const p = gs.players[pi];
          if (p.status !== 'eliminated') {
            gs.changeLobbyCards(pi, 1);
            const drawn = gs.drawPlayerCards(pi, 2);
            p.hand.push(...drawn);
          }
        }
        gs.addLog('M-JIMU2: 全員に根回しカード×1配布、全員手札+2枚');
        return { success: true };
      }

      case 'M-DX': {
        // メディカルDX: 病院長の評価+1 + 手札からアクションカード2枚を即座に発現
        gs.changeFavor(1);
        gs.addLog('M-DX: 病院長の評価+1。手札から2枚のアクションカードを選択して即座に効果発現');
        return { success: true, needsDXSelection: true };
      }

      default: {
        gs.addLog(`不明なマネジメントカード: ${card.id}`);
        return { success: true };
      }
    }
  },

  /**
   * A51 の根回しカード渡し先を確定する。
   * @param {GameState} gs
   * @param {number} fromIndex
   * @param {number} toIndex
   */
  completeA51(gs, fromIndex, toIndex) {
    const to = gs.players[toIndex];
    if (!to || to.status === 'eliminated' || fromIndex === toIndex) {
      gs.addLog('A51: 無効な対象');
      return;
    }
    gs.changeLobbyCards(toIndex, 1);
    gs.addLog(`A51: ${gs.players[fromIndex].profession.name} → ${to.profession.name} に根回しカード×1`);
  },

  /**
   * M-MSW1 のソーシャル必要数-2の対象スロットを確定する。
   * @param {GameState} gs
   * @param {number} slotIndex - 対象スロット（0-based）
   */
  completeMSW1(gs, slotIndex) {
    const patient = gs.patientSlots[slotIndex];
    if (!patient) {
      gs.addLog('M-MSW1: 無効なスロット');
      return;
    }
    const required = patient.requiredActions['ソーシャル'] || 0;
    const reduction = Math.min(2, required);
    gs.slotActions[slotIndex]['ソーシャル'] = (gs.slotActions[slotIndex]['ソーシャル'] || 0) + reduction;
    gs.addLog(`M-MSW1: スロット${slotIndex + 1}「${patient.title}」のソーシャル必要数を${reduction}減少`);

    // 即時解決チェック
    if (gs.patientSlots[slotIndex]) {
      const fulfilled = Actions._checkFulfilled(gs, slotIndex);
      if (fulfilled) {
        gs.resolveSlot(slotIndex);
        gs.compactSlots();
      }
    }
  },

  /**
   * A52 のバーンアウト-1対象を確定する。
   * @param {GameState} gs
   * @param {number} targetIndex
   */
  completeA52(gs, targetIndex) {
    const target = gs.players[targetIndex];
    if (!target || target.status === 'eliminated') {
      gs.addLog('A52: 無効な対象');
      return;
    }
    gs.changeBurnout(targetIndex, -1, true);
    gs.addLog(`A52: ${target.profession.name}のバーンアウト-1`);
  },

  /**
   * M-DX「メディカルDX」で選択した2枚のアクションカードの効果を即座に発現する。
   * マネジメントカードは選択不可。各カードは患者ケースへのアクション提供として扱う。
   * @param {GameState} gs
   * @param {number} playerIndex
   * @param {Array<{cardIndex: number, targetSlot: number}>} selections - 2枚分の選択
   */
  completeDX(gs, playerIndex, selections) {
    const player = gs.players[playerIndex];
    // インデックスを降順ソートして削除（位置ずれ防止）
    const sorted = [...selections].sort((a, b) => b.cardIndex - a.cardIndex);
    for (const sel of sorted) {
      const card = player.hand[sel.cardIndex];
      if (!card) continue;
      if (card.type === 'マネジメント') {
        gs.addLog(`M-DX: 「${card.title}」はマネジメントカードのため使用不可`);
        continue;
      }
      const actionType = card.type;
      const targetSlot = sel.targetSlot;
      const patient = gs.patientSlots[targetSlot];
      if (!patient) {
        gs.addLog(`M-DX: スロット${targetSlot + 1}に患者がいない`);
        continue;
      }
      // アクション提供
      gs.slotActions[targetSlot][actionType] = (gs.slotActions[targetSlot][actionType] || 0) + 1;
      gs.slotActions[targetSlot].lastProvider = player.id;
      // 手札から除去
      player.hand.splice(sel.cardIndex, 1);
      gs.discardPile.push(card);
      gs.addLog(`M-DX: 「${card.title}」(${actionType}) → スロット${targetSlot + 1}「${patient.title}」`);
      // 即時解決チェック
      if (gs.patientSlots[targetSlot]) {
        const fulfilled = Actions._checkFulfilled(gs, targetSlot);
        if (fulfilled) {
          gs.resolveSlot(targetSlot);
          gs.compactSlots();
        }
      }
    }
  },

  /**
   * M-JIMU1「診療報酬最適化」の捨て→補充を確定する。
   * @param {GameState} gs
   * @param {number} playerIndex
   * @param {number[]} discardIndices - 捨てるカードのインデックス配列
   */
  completeJIMU1(gs, playerIndex, discardIndices) {
    const player = gs.players[playerIndex];
    // インデックスを降順ソートして削除（位置ずれ防止）
    const sorted = [...discardIndices].sort((a, b) => b - a);
    const discarded = [];
    for (const idx of sorted) {
      if (idx >= 0 && idx < player.hand.length) {
        discarded.push(player.hand.splice(idx, 1)[0]);
      }
    }
    gs.discardPile.push(...discarded);

    // 捨てた枚数分を山札から補充
    const drawn = gs.drawPlayerCards(playerIndex, discarded.length);
    player.hand.push(...drawn);

    gs.addLog(`M-JIMU1: ${discarded.length}枚捨てて${drawn.length}枚補充`);
  },

  // ====================================================================
  // 5. 私の仕事じゃないのに...（1ターン1回）
  // ====================================================================

  /**
   * 手札のアクションカード2枚を捨てて、任意の種別のアクション1回分を患者ケースに提供する。
   * バーンアウト+1を受ける（倍率適用済み）。
   *
   * @param {GameState} gs
   * @param {number} playerIndex
   * @param {number} card1Index - 捨てるカード1のインデックス
   * @param {number} card2Index - 捨てるカード2のインデックス
   * @param {number} targetSlot - 患者ゾーンのスロット番号（0-based）
   * @param {string} actionType - 提供するアクション種別（診察/エデュケーション/ソーシャル）
   * @returns {{ success: boolean, reason?: string }}
   */
  substitute(gs, playerIndex, card1Index, card2Index, targetSlot, actionType) {
    const player = gs.players[playerIndex];

    // --- バリデーション ---
    if (player.status === 'eliminated') return { success: false, reason: '脱落済み' };
    if (player.actionsRemaining <= 0) return { success: false, reason: '残りアクションなし' };
    if (player.substituteUsedThisTurn) return { success: false, reason: '私の仕事じゃないのに...は1ターンに1回まで' };
    if (player.hand.length < 2) return { success: false, reason: '手札が2枚未満' };
    if (card1Index === card2Index) return { success: false, reason: '同じカードを2回指定できない' };
    if (!['診察', 'エデュケーション', 'ソーシャル'].includes(actionType)) {
      return { success: false, reason: '無効なアクション種別（診察/エデュケーション/ソーシャルのみ）' };
    }

    const patient = gs.patientSlots[targetSlot];
    if (!patient) return { success: false, reason: 'そのスロットに患者がいない' };

    // C01 効果: スロット範囲チェック
    if (gs.slotsReduced && targetSlot >= gs.maxSlots - 1) {
      return { success: false, reason: 'スロット減少により使用不可' };
    }

    // --- カード消費バリデーション ---
    const required = patient.requiredActions[actionType] || 0;
    const provided = gs.slotActions[targetSlot][actionType] || 0;
    if (required <= 0) {
      return { success: false, reason: `この患者には${actionType}は必要ありません` };
    }
    if (provided >= required) {
      return { success: false, reason: `${actionType}は既に必要数(${required})を満たしています` };
    }

    // 2枚捨てる（インデックスが大きい方から削除して位置ずれを防ぐ）
    const indices = [card1Index, card2Index].sort((a, b) => b - a);
    const removed = [];
    for (const idx of indices) {
      removed.push(player.hand.splice(idx, 1)[0]);
    }
    gs.discardPile.push(...removed);

    // アクション提供
    gs.slotActions[targetSlot][actionType] = (gs.slotActions[targetSlot][actionType] || 0) + 1;
    gs.slotActions[targetSlot].lastProvider = player.id;

    // バーンアウト: 代行コスト+1のみ（警戒度バーンアウトは解決時に発生）
    gs.changeBurnout(playerIndex, 1, true);

    // コスト消費
    Actions._consumeAction(gs, playerIndex);
    player.substituteUsedThisTurn = true;

    gs.addLog(
      `${player.profession.name}: 私の仕事じゃないのに...（${actionType}）` +
      ` → スロット${targetSlot + 1}「${patient.title}」`
    );

    // --- 即時解決チェック ---
    if (gs.patientSlots[targetSlot]) {
      const fulfilled = Actions._checkFulfilled(gs, targetSlot);
      if (fulfilled) {
        gs.resolveSlot(targetSlot);
        gs.compactSlots();
      }
    }

    return { success: true };
  },

  // ====================================================================
  // 6. パス
  // ====================================================================

  /**
   * 残りアクションをすべて放棄してターンを終了する。
   *
   * @param {GameState} gs
   * @param {number} playerIndex
   * @returns {{ success: boolean }}
   */
  pass(gs, playerIndex) {
    const player = gs.players[playerIndex];
    const remaining = player.actionsRemaining;
    player.actionsRemaining = 0;
    gs.addLog(`${player.profession.name}: パス（残り${remaining}アクションを放棄）`);
    return { success: true };
  },

  // ====================================================================
  // 補助: ウィスパーチャット（根回しカード1枚消費、アクション消費なし）
  // ====================================================================

  /**
   * 根回しカード1枚を消費して特定プレイヤーにのみメッセージを送信する。
   * アクションを消費しない。いつでも使用可能。
   *
   * @param {GameState} gs
   * @param {number} fromIndex
   * @param {number} toIndex
   * @param {string} message
   * @returns {{ success: boolean, reason?: string }}
   */
  whisper(gs, fromIndex, toIndex, message) {
    const from = gs.players[fromIndex];
    const to = gs.players[toIndex];

    if (from.lobbyCards <= 0) return { success: false, reason: '根回しカードなし' };
    if (fromIndex === toIndex) return { success: false, reason: '自分にはウィスパーできない' };
    if (to.status === 'eliminated') return { success: false, reason: '脱落プレイヤーにはウィスパーできない' };

    from.lobbyCards--;
    gs.addLog(`${from.profession.name} → ${to.profession.name}: ウィスパーチャット（内容非公開）`);

    return { success: true, to: to.id, message };
  },

  // ====================================================================
  // 内部ヘルパー
  // ====================================================================

  /**
   * アクション使用回数を+1し、そのプレイヤー個人が3回目ならバーンアウト+2を発生させる。
   * 判定は各プレイヤーの actionsUsedThisRound で行い、他プレイヤーの使用回数は影響しない。
   * 全てのアクション消費箇所でこの関数を使うこと。
   * @private
   * @param {GameState} gs
   * @param {number} playerIndex
   */
  _consumeAction(gs, playerIndex) {
    const player = gs.players[playerIndex];
    player.actionsRemaining--;
    player.actionsUsedThisRound++;
    // このプレイヤー個人が3回目のアクションを使用したらバーンアウト+2
    // E18効果: _noBurnoutOn3rdAction がtrueなら3回目のバーンアウトをスキップ
    if (player.actionsUsedThisRound === CONSTANTS.ACTIONS_PER_TURN) {
      if (gs._noBurnoutOn3rdAction) {
        gs.addLog(`${player.profession.name}（個人）: 3回目のアクション使用（E18効果でバーンアウトなし）`);
      } else {
        gs.addLog(`${player.profession.name}（個人）: 3回目のアクション使用 → バーンアウト+2`);
        gs.changeBurnout(playerIndex, 2, true);
      }
    }
  },

  /**
   * 警戒度に応じたバーンアウトコストを返す。
   * @private
   * @param {string} alertLevel
   * @returns {number}
   */
  _getAlertBurnout(alertLevel) {
    switch (alertLevel) {
      case '要注意': return 1;
      case '要警戒': return 2;
      default: return 0;
    }
  },

  /**
   * 指定スロットの患者が全アクション充足しているか判定する。
   * @private
   * @param {GameState} gs
   * @param {number} slotIndex
   * @returns {boolean}
   */
  _checkFulfilled(gs, slotIndex) {
    const patient = gs.patientSlots[slotIndex];
    if (!patient) return false;
    const actions = gs.slotActions[slotIndex];
    const required = patient.requiredActions;
    for (const [type, count] of Object.entries(required)) {
      if (count > 0 && (actions[type] || 0) < count) {
        return false;
      }
    }
    return true;
  }
};
