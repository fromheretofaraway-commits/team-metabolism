// main.js - ゲーム進行制御
// UI とゲームロジック (Cards, Phases, Actions) の橋渡し
//
// 依存:
//   DATA, CONSTANTS          (data.js, constants.js)
//   GameState, PlayerState   (gameState.js)
//   Cards                    (cards.js)
//   Phases                   (phases.js)
//   Actions                  (actions.js)
//   UI                       (index.html 内で定義)

const Game = {
  gs: null,           // GameState
  _pendingCard: null,  // 要判断イベント / 危機カードの一時保持
  _pendingResult: null,

  // ==================================================================
  // ゲーム開始
  // ==================================================================

  /**
   * ゲームを初期化して最初のラウンドを開始する。
   * @param {number} playerCount - プレイ人数 (3-6)
   * @param {string} difficulty  - 難易度キー (入門/標準/上級/地獄)
   * @param {string[]} professionIds - 各プレイヤーの職種ID配列
   * @param {object} [options] - 難易度オプション
   */
  start(playerCount, difficulty, professionIds, options) {
    this.gs = Cards.initializeGame(playerCount, difficulty, professionIds);

    // 難易度オプション適用
    if (options) {
      this._applyDifficultyOptions(options);
    }

    // 3人プレイNPC設定
    if (this.gs.isNpcGame) {
      this._setupNpcs(professionIds);
    }

    this.gs.startRound();

    UI.hideSetup();
    UI.renderAll(this.gs);

    // 秘密ミッション選択をスキップ（プロトタイプ: 1枚目を自動選択）
    for (const p of this.gs.players) {
      if (p._missionChoices && p._missionChoices.length > 0) {
        p.secretMission = p._missionChoices[0];
      }
    }

    this.runPhase0();
  },

  /**
   * 難易度オプションをGameStateに適用する。
   * @private
   */
  _applyDifficultyOptions(options) {
    const gs = this.gs;
    const opts = gs.difficultyOptions;

    // ハードモード
    if (options.hardStrategyTime) {
      opts.strategyTimeMultiplier = 0.5; // 60→30秒
    }
    if (options.hardHandLimit) {
      opts.initialHandSize = 4;
      // 既に配布済みの手札を1枚ずつ減らす
      for (const p of gs.players) {
        if (p.hand.length > 4) {
          const removed = p.hand.splice(4);
          gs.discardPile.push(...removed);
        }
      }
    }
    if (options.hardExtraPatients) {
      opts.extraPatientsPerRound = 1;
    }

    // イージーモード
    if (options.easyStrategyTime) {
      opts.strategyTimeMultiplier = 1.5; // 60→90秒
    }
    if (options.easyBurnout) {
      opts.burnoutThresholdBonus = 1;
      for (const p of gs.players) {
        p.profession.burnoutThreshold += 1;
      }
    }
    if (options.easyExtraSkill) {
      opts.skillUsesAllowed = 2;
      // skillUsedフラグの代わりにカウンタ管理が必要だが、
      // プロトタイプではskillUsedをリセット可能にする
      for (const p of gs.players) {
        p._skillUsesRemaining = 2;
      }
    }
    if (options.easyFreeCommunication) {
      opts.freeCommunication = true;
    }
  },

  /**
   * 3人プレイ時のNPC設定。
   * @private
   */
  _setupNpcs(playerProfIds) {
    const gs = this.gs;
    // 推奨NPC: 薬剤師(R04)と臨床心理士(R07)
    const npcCandidates = ['R04', 'R07'];
    const allProfIds = CONSTANTS.SELECTABLE_PROFESSIONS;
    const usedIds = new Set(playerProfIds);

    // 推奨NPCから未使用のものを優先
    const npcIds = [];
    for (const id of npcCandidates) {
      if (!usedIds.has(id)) {
        npcIds.push(id);
      }
    }
    // 推奨が足りなければ残りから補充
    for (const id of allProfIds) {
      if (npcIds.length >= 2) break;
      if (!usedIds.has(id) && !npcIds.includes(id)) {
        npcIds.push(id);
      }
    }

    for (const id of npcIds.slice(0, 2)) {
      const prof = DATA.professions.find(p => p.id === id);
      const npcEntry = {
        id: `NPC_${id}`,
        professionId: id,
        name: prof ? prof.name : id,
        actionDeck: Cards.buildPlayerDeck(id)
      };
      gs.npcs.push(npcEntry);
      gs.addLog(`NPC配置: ${prof ? prof.name : id}`);
    }
  },

  // ==================================================================
  // フェーズ0: 申し送り
  // ==================================================================

  runPhase0() {
    if (this.gs.gameOver) { this.endGame(); return; }

    const result = Phases.phase0(this.gs);
    UI.renderAll(this.gs);

    const timerSec = Math.round(result.timerSeconds * (this.gs.difficultyOptions.strategyTimeMultiplier || 1));
    UI.showMessage(`フェーズ0: 申し送り（${timerSec}秒）`);

    // コミュニケーション制限（イージーモードの自由通信では無効化）
    if (result.communicationRestricted && !this.gs.difficultyOptions.freeCommunication) {
      UI.showMessage('コミュニケーション制限中: 情報共有不可');
    }

    // フェーズ0改善: 手札種別概要の表示
    UI.showBriefingSummary(this.gs);

    // 優先患者指定UI → 次フェーズへのボタンを表示
    UI.showPhaseControls('briefing', () => {
      // 優先患者が選択されていればセット
      const selectedSlot = UI.getSelectedPrioritySlot();
      Phases.setPriorityPatient(this.gs, selectedSlot);
      this.runPhase1();
    });
  },

  // ==================================================================
  // フェーズ1: イベント
  // ==================================================================

  runPhase1() {
    if (this.gs.gameOver) { this.endGame(); return; }

    const result = Phases.phase1(this.gs);
    UI.renderAll(this.gs);

    switch (result.type) {
      case 'skipped':
      case 'empty':
        UI.showMessage('イベントフェーズ: スキップ');
        UI.showPhaseControls('event_done', () => this.runPhase2());
        break;

      case 'defeat':
        this.handleDefeatCheck(result.reason);
        break;

      case 'crisis':
        this._pendingCard = result.card;
        UI.showCrisisCard(result.card);
        UI.showDecisionUI(
          Game._buildCrisisOptions(result.card),
          (decision) => {
            const defeatReason = Phases.applyCrisisEffect(this.gs, result.card, decision);
            this._pendingCard = null;
            if (defeatReason) {
              this.handleDefeatCheck(defeatReason);
            } else {
              UI.renderAll(this.gs);
              UI.showPhaseControls('event_done', () => this.runPhase2());
            }
          }
        );
        break;

      case 'auto_event':
        UI.showEventCard(result.card);
        UI.showPhaseControls('event_done', () => this.runPhase2());
        break;

      case 'decision_event':
        this._pendingCard = result.card;
        UI.showEventCard(result.card);
        UI.showDecisionUI(
          Game._buildEventDecisionOptions(result.card),
          (decision) => {
            const defeatReason = Phases.applyDecisionEvent(this.gs, result.card, decision);
            this._pendingCard = null;
            if (defeatReason) {
              this.handleDefeatCheck(defeatReason);
            } else {
              UI.renderAll(this.gs);
              UI.showPhaseControls('event_done', () => this.runPhase2());
            }
          }
        );
        break;

      default:
        UI.showPhaseControls('event_done', () => this.runPhase2());
    }
  },

  // ==================================================================
  // フェーズ2: 患者ケース追加
  // ==================================================================

  runPhase2() {
    if (this.gs.gameOver) { this.endGame(); return; }

    // 難易度オプション: 患者追加枚数増加
    const extraPatients = this.gs.difficultyOptions.extraPatientsPerRound || 0;
    if (extraPatients > 0) {
      // phase2の前に追加枚数を一時的に増やす処理は
      // getPatientAddCount内で行うため、gsにフラグを立てる
      this.gs._extraPatientsThisRound = extraPatients;
    }

    const defeatReason = Phases.phase2(this.gs);
    this.gs._extraPatientsThisRound = 0;
    UI.renderAll(this.gs);

    if (defeatReason) {
      this.handleDefeatCheck(defeatReason);
      return;
    }

    UI.showMessage(`フェーズ2: 患者ケース追加完了`);
    UI.showPhaseControls('patient_done', () => this.runPhase3());
  },

  // ==================================================================
  // フェーズ3: アクションフェーズ
  // ==================================================================

  runPhase3() {
    if (this.gs.gameOver) { this.endGame(); return; }

    const result = Phases.phase3Start(this.gs);
    UI.renderAll(this.gs);
    UI.showMessage('フェーズ3: アクションフェーズ開始');

    this.runPlayerTurn(result.firstPlayerIndex);
  },

  /**
   * 指定プレイヤーのターンを開始する。
   * @param {number} playerIndex
   */
  runPlayerTurn(playerIndex) {
    if (this.gs.gameOver) { this.endGame(); return; }

    const result = Phases.startPlayerTurn(this.gs, playerIndex);
    UI.renderAll(this.gs);

    // スキップ系
    if (result.type === 'skip_leave' || result.type === 'skip_event' || result.type === 'skip_eliminated' || result.type === 'skip_burnout') {
      this._advanceToNextPlayer(playerIndex);
      return;
    }

    const player = this.gs.players[playerIndex];
    UI.showMessage(`${player.profession.name} のターン（アクション残り ${player.actionsRemaining}回）`);

    // 手札上限超過時の捨て札処理
    if (result.needsDiscard) {
      UI.showDiscardUI(this.gs, playerIndex, (cardIndex) => {
        Phases.discardExcess(this.gs, playerIndex, cardIndex);
        UI.renderAll(this.gs);
        this._showActionUI(playerIndex);
      });
    } else {
      this._showActionUI(playerIndex);
    }
  },

  /**
   * アクション選択UIを表示する。
   * @private
   */
  _showActionUI(playerIndex) {
    const player = this.gs.players[playerIndex];
    console.log('[_showActionUI] playerIndex=' + playerIndex + ' name=' + (player.profession ? player.profession.name : '?') + ' actionsRemaining=' + player.actionsRemaining + ' hand=' + player.hand.length);

    if (player.actionsRemaining <= 0 || player.status === 'eliminated') {
      console.log('[_showActionUI] Skipping: actions=' + player.actionsRemaining + ' status=' + player.status);
      this._advanceToNextPlayer(playerIndex);
      return;
    }

    UI.renderAll(this.gs);
    UI.renderHand(this.gs, playerIndex);

    // 3回目アクション警告ヘルパー: 残り1回で実行するとBN+2になる場合に確認
    const _confirmIfLastAction = (callback) => {
      if (player.actionsRemaining === 1 && player.actionsUsedThisRound === (CONSTANTS.ACTIONS_PER_TURN - 1) && !this.gs._noBurnoutOn3rdAction) {
        UI.showDecisionUI({
          type: 'confirm',
          label: `⚠ これが3回目のアクションです。実行するとバーンアウト+2が発生します。実行しますか？`,
          toDecision: (accepted) => ({ accepted })
        }, (decision) => {
          if (decision.accepted) callback();
          else this._showActionUI(playerIndex);
        });
      } else {
        callback();
      }
    };

    UI.renderActionButtons(this.gs, playerIndex, {
      onPlayCard: (cardIndex, targetSlot) => {
        const card = player.hand[cardIndex];
        if (!card.actionType) card.actionType = card.type;
        _confirmIfLastAction(() => {
        const res = Actions.playCard(this.gs, playerIndex, cardIndex, targetSlot);
        if (res.success) {
          // アニメーション: バーンアウト増加
          if (res.burnoutAdded) {
            UI.animateBurnout(playerIndex);
          }
          // マネジメントカードの追加処理
          if (res.needsTarget) {
            UI.showTargetSelection(this.gs, playerIndex, res.effect, (targetIndex) => {
              if (res.effect === 'give_lobby') Actions.completeA51(this.gs, playerIndex, targetIndex);
              else if (res.effect === 'burnout-1') Actions.completeA52(this.gs, targetIndex);
              UI.renderAll(this.gs);
              this._showActionUI(playerIndex);
            });
            return;
          }
          // M-MSW1: スロット選択
          if (res.needsSlotTarget) {
            UI.showMessage('ソーシャル必要数を2減らす患者スロットを選択してください');
            UI.showSlotSelection(this.gs, (slotIndex) => {
              Actions.completeMSW1(this.gs, slotIndex);
              UI.renderAll(this.gs);
              this._showActionUI(playerIndex);
            });
            return;
          }
          // M-JIMU1: 捨て→補充
          if (res.needsDiscard && res.effect === 'jimu1_refresh') {
            UI.showMessage('診療報酬最適化: 捨てるカードを好きな枚数選択してください');
            UI.showMultiDiscardUI(this.gs, playerIndex, (discardIndices) => {
              Actions.completeJIMU1(this.gs, playerIndex, discardIndices);
              UI.renderAll(this.gs);
              this._showActionUI(playerIndex);
            });
            return;
          }
          // M-DX: 2枚選択→即座に発現
          if (res.needsDXSelection) {
            UI.showMessage('メディカルDX: 効果を発現するカード2枚を選択');
            this._handleDXSelection(playerIndex, 0, []);
            return;
          }
        } else {
          UI.showMessage(res.reason);
        }
        UI.renderAll(this.gs);
        this._showActionUI(playerIndex);
        }); // _confirmIfLastAction 閉じ
      },

      onUseLobby: (effect, targetIndex) => {
        _confirmIfLastAction(() => {
        const res = Actions.useLobbyCard(this.gs, playerIndex, effect, targetIndex);
        if (!res.success) UI.showMessage(res.reason);
        UI.renderAll(this.gs);
        this._showActionUI(playerIndex);
        }); // _confirmIfLastAction 閉じ
      },

      onUseSkill: () => {
        // まず確認ステップ（confirmedなし）
        const preRes = Actions.useSkill(this.gs, playerIndex);
        if (preRes.needsConfirmation) {
          const profId = this.gs.players[playerIndex].professionId;
          let detailText = preRes.skillEffect || '';
          if (profId === 'R01') detailText += '\n\n→ 解決する患者スロットを選択します';
          if (profId === 'R04') detailText += '\n\n→ 3枚引いて2枚を選んで手札に加えます';
          if (profId === 'R06') detailText += '\n\n→ 対象プレイヤーを選択します';

          UI.showSkillConfirmation(preRes.skillName, detailText, () => {
            const res = Actions.useSkill(this.gs, playerIndex, { confirmed: true });
            if (!res.success) {
              UI.showMessage(res.reason);
              UI.renderAll(this.gs);
              this._showActionUI(playerIndex);
              return;
            }
            // R01: スロット選択で強制解決
            if (res.needsSlotTarget && res.effect === 'force_resolve') {
              UI.showMessage('チームの船頭: 解決する患者スロットを選択');
              UI.showSlotSelection(this.gs, (slotIndex) => {
                Actions.completeSkillR01(this.gs, slotIndex);
                UI.renderAll(this.gs);
                this._showActionUI(playerIndex);
              });
              return;
            }
            // R06: 対象プレイヤー選択でBN-3
            if (res.needsTarget && res.effect === 'burnout-3') {
              UI.showMessage('1 on 1: バーンアウトを回復する対象を選択');
              UI.showTargetSelection(this.gs, playerIndex, res.effect, (targetIndex) => {
                Actions.completeSkillR06(this.gs, playerIndex, targetIndex);
                UI.showMessage(`${this.gs.players[targetIndex].profession.name} のバーンアウト-3`);
                UI.renderAll(this.gs);
                this._showActionUI(playerIndex);
              });
              return;
            }
            // R04: 3枚から2枚選択
            if (res.needsSelection) {
              UI.showMessage('手札に加えるカード2枚を選択してください');
              UI.showCardSelection(res.drawnCards, res.selectCount, (selectedIndices) => {
                Actions.completeSkillR04(this.gs, playerIndex, selectedIndices);
                UI.showMessage('カード2枚を手札に追加しました');
                UI.renderAll(this.gs);
                this._showActionUI(playerIndex);
              });
              return;
            }
            // その他のスキル（即時効果）
            UI.renderAll(this.gs);
            this._showActionUI(playerIndex);
          });
          return;
        }
        if (!preRes.success) UI.showMessage(preRes.reason);
        UI.renderAll(this.gs);
        this._showActionUI(playerIndex);
      },

      onSubstitute: (card1Index, card2Index, targetSlot, actionType) => {
        const res = Actions.substitute(this.gs, playerIndex, card1Index, card2Index, targetSlot, actionType);
        if (!res.success) UI.showMessage(res.reason);
        UI.renderAll(this.gs);
        this._showActionUI(playerIndex);
      },

      onPass: () => {
        Actions.pass(this.gs, playerIndex);
        UI.renderAll(this.gs);
        this._advanceToNextPlayer(playerIndex);
      }
    });
  },

  /**
   * 次のプレイヤーに進む。全員終了ならNPC処理→フェーズ4へ。
   * @private
   */
  _advanceToNextPlayer(currentIndex) {
    const nextIndex = this.gs.getNextActivePlayerIndex(currentIndex);

    // 一巡したらNPC処理→フェーズ4へ
    if (nextIndex === this.gs.startPlayerIndex) {
      this._processNpcAndPhase4();
      return;
    }

    this.runPlayerTurn(nextIndex);
  },

  /**
   * NPC処理を行ってからフェーズ4へ進む。
   * @private
   */
  _processNpcAndPhase4() {
    // NPC自動処理
    Phases.processNpcActions(this.gs);
    UI.renderAll(this.gs);
    this.runPhase4();
  },

  // ==================================================================
  // フェーズ4: 患者ケース解決
  // ==================================================================

  runPhase4() {
    if (this.gs.gameOver) { this.endGame(); return; }

    const result = Phases.phase4(this.gs);
    UI.renderAll(this.gs);

    if (result.defeatReason) {
      this.handleDefeatCheck(result.defeatReason);
      return;
    }

    // 解決アニメーション
    if (result.resolved.length > 0) {
      UI.animateResolve(result.resolved);
    }

    const count = result.resolved.length;
    UI.showMessage(`フェーズ4: ${count}枚の患者ケースを解決`);
    UI.showPhaseControls('resolve_done', () => this.runPhase5());
  },

  // ==================================================================
  // フェーズ5: ラウンド終了
  // ==================================================================

  runPhase5() {
    if (this.gs.gameOver) { this.endGame(); return; }

    const result = Phases.phase5(this.gs);
    UI.renderAll(this.gs);

    switch (result.type) {
      case 'defeat':
        this.handleDefeatCheck(result.defeatReason);
        break;

      case 'game_end':
        this.endGame();
        break;

      case 'next_round':
        UI.showMessage(`ラウンド${result.round}開始`);
        UI.showPhaseControls('round_start', () => this.runPhase0());
        break;
    }
  },

  // ==================================================================
  // 敗北チェック
  // ==================================================================

  handleDefeatCheck(reason) {
    if (reason) {
      this.gs.gameOver = true;
      this.gs.gameOverReason = reason;
      this.gs.teamWin = false;
      this.gs.currentPhase = 'gameover';
    }
    this.endGame();
  },

  // ==================================================================
  // ゲーム終了 → 演説 → 投票 → デブリーフィング
  // ==================================================================

  endGame() {
    this.gs.currentPhase = 'gameover';
    UI.renderAll(this.gs);

    if (this.gs.teamWin) {
      UI.animateVictory();
      UI.showMessage('チーム勝利！ 終了フェーズに移行します');
    } else {
      UI.animateDefeat();
      UI.showMessage(`チーム敗北: ${this.gs.gameOverReason || ''}`);
    }

    // 勝敗に関わらず、終了フェーズ（演説→投票→ミッション公開→デブリーフィング）へ
    setTimeout(() => {
      this._startEndPhase();
    }, 1500);
  },

  /**
   * 終了フェーズ: 演説 → 投票 → 秘密ミッション公開 → デブリーフィング
   */
  _startEndPhase() {
    UI.showMessage('=== 終了フェーズ ===  まず貢献演説タイムです');
    UI.showPhaseControls('end_phase_start', () => {
      this._startSpeechPhase();
    });
  },

  // ==================================================================
  // L4: 貢献演説タイム
  // ==================================================================

  _startSpeechPhase() {
    const gs = this.gs;
    const playerOrder = [];
    let idx = gs.startPlayerIndex;
    for (let i = 0; i < gs.playerCount; i++) {
      if (gs.players[idx].status !== 'eliminated') {
        playerOrder.push(idx);
      }
      idx = (idx + 1) % gs.playerCount;
    }

    this._speechQueue = playerOrder;
    this._speechIndex = 0;
    this._runNextSpeech();
  },

  _runNextSpeech() {
    const gs = this.gs;

    if (this._speechIndex >= this._speechQueue.length) {
      // 全員の演説完了 → 投票フェーズへ
      UI.showMessage('演説完了。次は投票フェーズです');
      UI.showPhaseControls('vote_start', () => {
        this._startVotingPhase();
      });
      return;
    }

    const playerIndex = this._speechQueue[this._speechIndex];
    const player = gs.players[playerIndex];

    UI.showSpeechUI(gs, playerIndex, 60, () => {
      this._speechIndex++;
      this._runNextSpeech();
    });
  },

  // ==================================================================
  // L5-L6: 投票フェーズ
  // ==================================================================

  _startVotingPhase() {
    const gs = this.gs;
    this._votes = {}; // { receiverPlayerId: count }
    for (const p of gs.players) {
      this._votes[p.id] = 0;
    }

    // 投票順序: スタートプレイヤーから
    const voteOrder = [];
    let idx = gs.startPlayerIndex;
    for (let i = 0; i < gs.playerCount; i++) {
      if (gs.players[idx].status !== 'eliminated') {
        voteOrder.push(idx);
      }
      idx = (idx + 1) % gs.playerCount;
    }

    this._voteQueue = voteOrder;
    this._voteIndex = 0;
    this._runNextVote();
  },

  _runNextVote() {
    const gs = this.gs;

    if (this._voteIndex >= this._voteQueue.length) {
      // 全員の投票完了 → 秘密ミッション公開フェーズへ
      UI.showMessage('投票完了。次は秘密ミッション公開です');
      UI.showPhaseControls('mission_reveal', () => {
        this._finalizeMissionsAndVP();
      });
      return;
    }

    const playerIndex = this._voteQueue[this._voteIndex];
    const player = gs.players[playerIndex];

    UI.showVotingUI(gs, playerIndex, 120, (allocations) => {
      // allocations: { playerId: count, ... }
      for (const [pid, count] of Object.entries(allocations)) {
        this._votes[pid] = (this._votes[pid] || 0) + count;
      }
      this._voteIndex++;
      this._runNextVote();
    });
  },

  // ==================================================================
  // L7-L9: 秘密ミッション公開・VP集計・MVP
  // ==================================================================

  _finalizeMissionsAndVP() {
    const gs = this.gs;

    // 秘密ミッション達成判定（簡易: 手動確認ボタン式）
    // プレイログベースで自動判定できるもの
    for (const p of gs.players) {
      if (!p.secretMission) continue;
      const m = p.secretMission;

      // 自動判定可能なミッション
      switch (m.id) {
        case 'M07': // バーンアウトゼロ
          m.achieved = (p.burnout === 0);
          break;
        case 'M05': // 専門性の証明（6枚以上解決 → 近似: votingCards >= 6）
          m.achieved = (p.votingCards >= 6);
          break;
        default:
          // 手動確認が必要なミッションは未達成としておく
          if (m.achieved === undefined) m.achieved = false;
          break;
      }
    }

    // VP集計
    const vpResults = Phases.calculateFinalVP(gs, this._votes);
    gs.votingPhaseData = {
      votes: this._votes,
      results: vpResults
    };

    // ミッション公開 → VP集計表示 → デブリーフィング
    UI.showMissionRevealAndVP(gs, vpResults, () => {
      this._showDebriefing();
    });
  },

  // ==================================================================
  // L10-L15: デブリーフィング画面
  // ==================================================================

  _showDebriefing() {
    UI.showDebriefing(this.gs);
  },

  // ==================================================================
  // M-DX: 2枚のカード選択→スロット選択を繰り返す
  // ==================================================================

  _handleDXSelection(playerIndex, count, selections) {
    if (count >= 2) {
      // 2枚選択完了
      Actions.completeDX(this.gs, playerIndex, selections);
      UI.renderAll(this.gs);
      this._showActionUI(playerIndex);
      return;
    }

    const player = this.gs.players[playerIndex];
    // マネジメントカード以外の手札をフィルタ
    const nonMgmt = player.hand
      .map((c, i) => ({ card: c, index: i }))
      .filter(x => x.card.type !== 'マネジメント');

    if (nonMgmt.length === 0) {
      UI.showMessage('使用可能なアクションカードがありません');
      UI.renderAll(this.gs);
      this._showActionUI(playerIndex);
      return;
    }

    UI.showCardSelection(
      nonMgmt.map(x => x.card),
      1,
      (selectedIndices) => {
        const origIndex = nonMgmt[selectedIndices[0]].index;
        // 対象スロット選択
        UI.showSlotSelection(this.gs, (slotIndex) => {
          selections.push({ cardIndex: origIndex, targetSlot: slotIndex });
          UI.showMessage(`DX: ${count + 1}枚目選択完了。${count + 1 < 2 ? '次の1枚を選択' : '効果発現'}`);
          this._handleDXSelection(playerIndex, count + 1, selections);
        });
      }
    );
  },

  // ==================================================================
  // 危機カード選択肢の構築
  // ==================================================================

  _buildCrisisOptions(card) {
    // 簡易実装: 最低限の選択肢を構築
    const activePlayers = this.gs.players
      .filter(p => p.status !== 'eliminated')
      .map(p => ({ id: p.id, name: p.profession.name }));

    switch (card.id) {
      case 'C01':
        // ◯◯さん、これもよろしく: リーダーがプレイヤーを指名してBN+3
        return {
          type: 'select_player',
          label: 'リーダーがバーンアウト+3を受けるプレイヤーを指名',
          candidates: activePlayers,
          fallback: activePlayers,
          toDecision: (selected) => ({ targetPlayerIds: [selected.id] })
        };

      case 'C04':
      case 'C06':
        return {
          type: 'acknowledge',
          label: card.immediateEffect,
          toDecision: () => ({})
        };

      case 'C05':
        return {
          type: 'confirm',
          label: '全員の根回しカードを消費して病院長の評価+2にしますか？\n（拒否すると病院長の評価-4）',
          toDecision: (accepted) => ({ accepted })
        };

      default:
        return {
          type: 'acknowledge',
          label: card.immediateEffect || card.effect || '効果を適用します',
          toDecision: () => ({})
        };
    }
  },

  // ==================================================================
  // 要判断イベントの選択肢構築
  // ==================================================================

  _buildEventDecisionOptions(card) {
    const activePlayers = this.gs.players
      .filter(p => p.status !== 'eliminated')
      .map(p => ({ id: p.id, name: p.profession.name }));

    switch (card.id) {
      case 'E02':
        return {
          type: 'acknowledge',
          label: '全プレイヤーが手札1枚を捨てます',
          toDecision: () => ({})
        };

      case 'E10': {
        const leader = this.gs.players[this.gs.leaderIndex];
        if (leader.lobbyCards >= 3) {
          return {
            type: 'acknowledge',
            label: `リーダー（${leader.profession.name}）が根回しカード3枚を捨てて引き留めます`,
            toDecision: () => ({})
          };
        } else {
          // 根回し不足: リーダー以外のプレイヤーを指名してバーンアウト+3
          const nonLeader = activePlayers.filter(p => p.id !== leader.id);
          return {
            type: 'select_player',
            label: `リーダーの根回しカードが不足（${leader.lobbyCards}枚）。バーンアウト+3を受けるプレイヤーを選択`,
            candidates: nonLeader,
            fallback: nonLeader,
            toDecision: (selected) => ({ targetPlayerId: selected.id })
          };
        }
      }

      case 'E14':
        return {
          type: 'confirm',
          label: `リーダー（${this.gs.players[this.gs.leaderIndex].profession.name}）が昇進を受け入れますか？（VP+3、以降アクション-1）`,
          toDecision: (accepted) => ({ accepted })
        };

      case 'E19':
        return {
          type: 'acknowledge',
          label: card.effect,
          toDecision: () => ({})
        };

      default:
        return {
          type: 'acknowledge',
          label: card.effect || '効果を適用',
          toDecision: () => ({})
        };
    }
  }
};
