// cards.js - デッキ構築・シャッフル
// DATA と CONSTANTS はグローバルに定義済みと仮定
//
// 依存するデータ:
//   DATA.normalEvents   - 通常イベントカード配列（12枚）
//   DATA.crisisCards    - 危機カード配列（6枚）
//   DATA.patientCases   - 患者ケースカード配列（30枚）
//   DATA.actionCards    - アクションカード配列（56枚）
//   DATA.secretMissions - 秘密ミッションカード配列（16枚）
//   DATA.professions    - 職種データ配列（8枚）
//   CONSTANTS.DIFFICULTY - 難易度別の危機カード枚数
//   CONSTANTS.INITIAL_HAND_SIZE - 初期手札枚数（5）
//   CONSTANTS.MAX_HAND_SIZE - 手札上限（7）

const Cards = {

  // ================================================================
  // Fisher-Yates シャッフル
  // ================================================================

  /**
   * 配列をシャッフルした新しい配列を返す（元の配列は変更しない）
   * @param {Array} array - シャッフル対象の配列
   * @returns {Array} シャッフルされた新しい配列
   */
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  // ================================================================
  // パンデミック方式のイベントデッキ構築
  // ================================================================

  /**
   * パンデミック方式でイベントデッキを構築する
   *
   * 手順:
   * 1. 通常イベント24枚をシャッフル
   * 2. 危機カードをcrisisCount枚ランダム選出
   * 3. 通常イベントを (crisisCount + 1) 等分してブロックに分ける
   * 4. 先頭ブロック以外の各ブロックに危機カード1枚を挿入してブロック内シャッフル
   * 5. ブロック順に積み重ねる（先頭ブロックが山札の上 = 最初に引かれる）
   *
   * これにより:
   * - ゲーム序盤は危機カードが出にくい
   * - 中盤以降は各ブロックに1枚ずつ分散して出現する
   * - いつ出るか正確にはわからない緊張感を生む
   *
   * @param {string} difficulty - 難易度キー（beginner/standard/advanced/hell）
   * @returns {Array} イベントデッキ（先頭 = 山札の上）
   */
  buildEventDeck(difficulty) {
    const crisisCount = CONSTANTS.DIFFICULTY[difficulty].crisisCount;

    // 通常イベント12枚をシャッフル
    const normalEvents = Cards.shuffle([...DATA.normalEvents]);

    // 危機カードをランダムにcrisisCount枚選出
    const crisisCards = Cards.shuffle([...DATA.crisisCards]).slice(0, crisisCount);

    // 通常イベントを (crisisCount + 1) ブロックに等分
    const blockCount = crisisCount + 1;
    const blockSize = Math.floor(normalEvents.length / blockCount);
    const remainder = normalEvents.length % blockCount;
    const blocks = [];

    let offset = 0;
    for (let i = 0; i < blockCount; i++) {
      // 余りを先頭ブロックから1枚ずつ分配して偏りを減らす
      const size = blockSize + (i < remainder ? 1 : 0);
      const block = normalEvents.slice(offset, offset + size);
      offset += size;
      blocks.push(block);
    }

    // 先頭ブロック（index 0）以外に危機カード1枚ずつ挿入
    for (let i = 1; i < blocks.length; i++) {
      if (crisisCards.length > 0) {
        const crisis = crisisCards.pop();
        blocks[i].push({ ...crisis, isCrisis: true });
        blocks[i] = Cards.shuffle(blocks[i]);
      }
    }

    // ブロック順に積み重ね（先頭ブロック = 山札の上 = 最初に引かれる）
    const deck = [];
    for (const block of blocks) {
      deck.push(...block);
    }

    return deck;
  },

  // ================================================================
  // 患者ケースデッキ構築
  // ================================================================

  /**
   * 患者ケースデッキを構築する（30枚シャッフル）
   * @returns {Array} 患者ケースデッキ
   */
  buildPatientDeck() {
    return Cards.shuffle([...DATA.patientCases]);
  },

  // ================================================================
  // アクションカードデッキ構築
  // ================================================================

  /**
   * 職種別アクションカードデッキを構築する
   * @param {string} professionId - 職種ID
   * @returns {Array} シャッフルされたアクションカードデッキ
   */
  buildPlayerDeck(professionId) {
    const deck = DATA.buildProfessionDeck(professionId);
    return Cards.shuffle(deck);
  },

  // ================================================================
  // マネジメントカード分配
  // ================================================================

  /**
   * シャッフル済みマネジメントカードをプレイヤーに分配する。
   * - 4人: 2枚ずつ均等
   * - 6人: 割り切れる場合は均等
   * - 3人/5人: 均等に配り、余りは先頭プレイヤーから1枚ずつ
   * （プロトタイプでは自動分配。実際のゲームではプレイヤーの相談で決定）
   * @param {Array} mgmtDeck - シャッフル済みマネジメントカード
   * @param {number} playerCount
   * @returns {Array<Array>} 各プレイヤーに配るカードの配列
   */
  _distributeMgmt(mgmtDeck, playerCount) {
    const result = [];
    for (let i = 0; i < playerCount; i++) {
      result.push([]);
    }
    // ラウンドロビンで1枚ずつ配る
    for (let i = 0; i < mgmtDeck.length; i++) {
      result[i % playerCount].push(mgmtDeck[i]);
    }
    return result;
  },

  // ================================================================
  // 秘密ミッションデッキ構築
  // ================================================================

  /**
   * 秘密ミッションデッキを構築する（16枚シャッフル）
   * @returns {Array} 秘密ミッションデッキ
   */
  buildMissionDeck() {
    return Cards.shuffle([...DATA.secretMissions]);
  },

  // ================================================================
  // 初期患者配置
  // ================================================================

  /**
   * ゲーム開始時に患者ケースを3枚スロットに配置する
   * スロット1〜3にそれぞれ1枚ずつ配置（押し出し不要）
   * @param {GameState} gameState - ゲーム状態オブジェクト
   */
  initialPatientSetup(gameState) {
    for (let i = 0; i < 4 && gameState.patientDeck.length > 0; i++) {
      gameState.patientSlots[i] = gameState.patientDeck.pop();
      gameState.slotActions[i] = {
        診察: 0,
        エデュケーション: 0,
        ソーシャル: 0,
        lastProvider: null
      };
      gameState.addLog(`初期配置: スロット${i + 1}に「${gameState.patientSlots[i].title}」`);
    }
  },

  // ================================================================
  // ゲーム初期化
  // ================================================================

  /**
   * ゲームを初期化して GameState を返す
   *
   * ルールブック「ゲームの準備」に従い以下を実行:
   * 1. イベントデッキ構築（パンデミック方式）
   * 2. 患者ケースデッキシャッフル
   * 3. アクションカードデッキシャッフル
   * 4. プレイヤー作成（職種選択済み）
   * 5. アクションカード5枚ずつ配布
   * 6. 根回しカード各2枚配布（PlayerState コンストラクタで設定済み）
   * 7. （信頼トークン廃止 → 根回しカードで代用）
   * 8. 秘密ミッション2枚ずつ配布（1枚選択はUIで処理）
   * 9. 初期患者3枚配置
   * 10. 結束度5、病院長の評価5にセット（GameState コンストラクタで設定済み）
   * 11. スタートプレイヤーをランダムに決定
   *
   * @param {number} playerCount - プレイ人数（3〜6）
   * @param {string} difficulty - 難易度キー
   * @param {Array<string>} professionIds - 各プレイヤーの職種ID配列
   * @returns {GameState} 初期化済みのゲーム状態
   */
  initializeGame(playerCount, difficulty, professionIds) {
    const gs = new GameState(playerCount, difficulty, professionIds);

    // デッキ構築
    gs.eventDeck = Cards.buildEventDeck(difficulty);
    gs.patientDeck = Cards.buildPatientDeck();

    // プレイヤー作成と個人デッキ構築・手札配布
    for (let i = 0; i < playerCount; i++) {
      const player = new PlayerState(`P${i + 1}`, professionIds[i]);

      // 個人デッキ構築（固有カードのみ）
      player.actionDeck = Cards.buildPlayerDeck(professionIds[i]);

      gs.players.push(player);
    }

    // マネジメントカードをシャッフルして各プレイヤーに分配
    const mgmtDeck = DATA.buildManagementDeck();
    const mgmtPerPlayer = Cards._distributeMgmt(mgmtDeck, playerCount);
    for (let i = 0; i < playerCount; i++) {
      gs.players[i].actionDeck.push(...mgmtPerPlayer[i]);
      // デッキ全体をシャッフル
      gs.players[i].actionDeck = Cards.shuffle(gs.players[i].actionDeck);
    }

    // 手札配布: INITIAL_HAND_SIZE枚（個人デッキから）
    for (let i = 0; i < playerCount; i++) {
      const player = gs.players[i];
      for (let j = 0; j < CONSTANTS.INITIAL_HAND_SIZE; j++) {
        if (player.actionDeck.length > 0) {
          player.hand.push(player.actionDeck.pop());
        }
      }
    }

    // 秘密ミッション配布: 各プレイヤーに2枚（1枚選択はUIで処理）
    const missionDeck = Cards.buildMissionDeck();
    for (let i = 0; i < playerCount; i++) {
      if (missionDeck.length >= 2) {
        gs.players[i]._missionChoices = [missionDeck.pop(), missionDeck.pop()];
      }
    }

    // 初期患者配置: 3枚
    Cards.initialPatientSetup(gs);

    // スタートプレイヤーをランダムに決定
    gs.startPlayerIndex = Math.floor(Math.random() * playerCount);
    gs.leaderIndex = gs.startPlayerIndex;
    gs.currentTurnIndex = gs.startPlayerIndex;

    gs.addLog(`ゲーム開始: ${playerCount}人, 難易度: ${difficulty}`);
    gs.addLog(`スタートプレイヤー: ${gs.players[gs.startPlayerIndex].profession.name}`);

    return gs;
  }
};
