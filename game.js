'use strict';

const games = [
  { id: 'mines', name: 'Mines', icon: '◈', detail: 'Pick your path', x: 0, y: 0, instructions: 'Find gems and avoid the mines. Each safe pick increases your return. Collect whenever you like.' },
  { id: 'towers', name: 'Towers', icon: '▤', detail: 'Climb higher', x: 50, y: 0, instructions: 'Choose one tile on the highlighted row. Two tiles are safe; one ends the round. Climb all eight rows or collect early.' },
  { id: 'coinflip', name: 'Coinflip', icon: '◉', detail: 'Make the call', x: 100, y: 0, instructions: 'Choose heads or tails. Match the result to return 1.95× your played credits. Each side has a 50% chance.' },
  { id: 'plinko', name: 'Plinko', icon: '⠿', detail: 'Let it drop', x: 0, y: 100, instructions: 'Drop a ball through eight rows. Each bounce goes left or right with equal chance. The final slot determines your return.' },
  { id: 'blackjack', name: 'Blackjack', icon: '♧', detail: 'Play your hand', x: 50, y: 100, instructions: 'Get closer to 21 than the dealer without going over. Dealer stands on all 17s. Wins return 2×, a natural blackjack 2.5×, and ties return your stake.' },
  { id: 'dice', name: 'Dice', icon: '⚄', detail: 'Roll your way', x: 100, y: 100, instructions: 'Choose a target and roll under it. Lower targets win less often but return more. Returns use a 97% theoretical payout rate.' }
];
const $ = (selector) => document.querySelector(selector);
const format = (number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(number);
const round = (number) => Math.round(number * 100) / 100;
const storageKey = 'idk-free-play-v1';
let saved;
try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch { /* Storage is optional. */ }
let balance = Number.isFinite(saved?.balance) && saved.balance >= 0 && saved.balance <= 1e12 ? saved.balance : 10000;
let history = Array.isArray(saved?.history) ? saved.history.filter(row => games.some(game => game.id === row.game) && Number.isFinite(row.stake) && Number.isFinite(row.payout) && Number.isFinite(row.multiplier) && Number.isFinite(row.time)).slice(0, 50) : [];
let historyFilter = 'all';
let currentGame = null;
let active = null;
let busy = false;
let toastTimeout;
let gameOpener;
let memoryWarning = false;
const dialog = $('#game-dialog');
const board = $('#game-board');
const playButton = $('#play-button');
const cashoutButton = $('#cashout-button');

function randomInt(max) {
  // Rejection sampling avoids modulo bias for arbitrary bounds.
  const limit = Math.floor(4294967296 / max) * max;
  const value = new Uint32Array(1);
  do { crypto.getRandomValues(value); } while (value[0] >= limit);
  return value[0] % max;
}
function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => $('#toast').classList.remove('visible'), 3500);
}
function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify({ balance, history })); }
  catch { if (!memoryWarning) { memoryWarning = true; toast('Browser storage is unavailable. Progress will last for this visit.'); } }
}
function updateBalance() {
  $('#balance').textContent = format(balance);
  $('#dialog-balance').textContent = format(balance);
  persist();
}
function refill() {
  if (active || busy) { toast('Finish your round before topping up.'); return; }
  if (balance >= 10000) { toast('You already have at least 10,000 credits. You’re ready to play!'); return; }
  balance = 10000;
  updateBalance();
  toast('Fresh start! Your balance is back to 10,000 credits.');
}
function renderHistory() {
  const rows = history.filter(row => historyFilter !== 'wins' || row.payout > row.stake);
  $('#history-body').innerHTML = rows.map(row => {
    const game = games.find(item => item.id === row.game);
    const when = new Date(row.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `<tr><td><a href="#play/${game.id}"><span class="row-icon">${game.icon}</span>${game.name}</a></td><td>${when}</td><td>${format(row.stake)}</td><td>${row.multiplier.toFixed(2)}×</td><td class="${row.payout > row.stake ? 'win' : 'loss'}">${format(row.payout)}</td></tr>`;
  }).join('');
  $('#history-empty').hidden = rows.length > 0;
  $('#history-empty h3').textContent = historyFilter === 'wins' && history.length ? 'No winning rounds yet.' : 'Your first round is waiting.';
  $('#history-empty p').textContent = historyFilter === 'wins' && history.length ? 'Rounds that return more than you played will appear here.' : 'Play a game and your results will appear here.';
}
function setStatus(message) { $('#game-status').textContent = message; }
function lockControls(locked) {
  $('#wager').disabled = locked;
  $('#half-wager').disabled = locked;
  $('#double-wager').disabled = locked;
  $('#game-options').querySelectorAll('input, select').forEach(input => { input.disabled = locked; });
  playButton.disabled = locked;
}
function finish(multiplier, message) {
  if (!active) return;
  const payout = round(active.stake * multiplier);
  balance = Math.min(1e12, round(balance + payout));
  history.unshift({ game: currentGame.id, stake: active.stake, payout, multiplier, time: Date.now() });
  history = history.slice(0, 50);
  active = null;
  busy = false;
  lockControls(false);
  cashoutButton.hidden = true;
  playButton.textContent = 'Play again';
  $('#close-game').disabled = false;
  setStatus(`${message} ${payout ? `${format(payout)} credits returned.` : 'No credits returned this round.'}`);
  updateBalance();
  renderHistory();
}
function begin() {
  if (active || busy) return false;
  const stake = Number($('#wager').value);
  if (!Number.isInteger(stake) || stake < 1 || stake > 1000000) { setStatus('Choose a whole number from 1 to 1,000,000.'); return false; }
  if (stake > balance) { setStatus('Not enough credits. Lower your amount or close this game and use + to top up for free.'); return false; }
  balance = round(balance - stake);
  active = { stake };
  updateBalance();
  lockControls(true);
  playButton.textContent = 'Round in progress';
  return true;
}
function optionSelect(id, label, values) {
  return `<label for="${id}">${label}</label><select id="${id}">${values.map(([value, text]) => `<option value="${value}">${text}</option>`).join('')}</select>`;
}
function drawMines() {
  board.innerHTML = `<div class="mine-grid" aria-label="Mines board">${Array.from({ length: 25 }, (_, i) => `<button class="tile" data-tile="${i}" aria-label="Tile ${i + 1}" disabled>·</button>`).join('')}</div><p class="board-caption">25 tiles. Choose your next move.</p>`;
}
function drawTowers() {
  board.innerHTML = `<div class="tower-grid" aria-label="Towers board">${Array.from({ length: 8 }, (_, row) => Array.from({ length: 3 }, (_, col) => `<button class="tile" data-row="${7 - row}" data-col="${col}" aria-label="Row ${8 - row}, tile ${col + 1}" disabled>◇</button>`).join('')).join('')}</div><p class="board-caption">Start at the bottom. Make your way up.</p>`;
}
function drawCoin() {
  board.innerHTML = '<div class="coin-scene"><div class="coin-face" aria-hidden="true">H</div></div><div class="big-result" id="coin-result">Make the call.</div><p class="board-caption">Two sides. One choice.</p>';
}
const slots = [8, 3, 1.4, 0.7, 0.4, 0.7, 1.4, 3, 8];
function drawPlinko() {
  board.innerHTML = `<div class="plinko-board" aria-label="Plinko board"><div class="plinko-ball"></div>${Array.from({ length: 8 }, (_, row) => `<div class="peg-row" style="top:${30 + row * 27}px">${'<span class="peg"></span>'.repeat(row + 2)}</div>`).join('')}<div class="plinko-slots">${slots.map(value => `<span>${value}×</span>`).join('')}</div></div><p class="board-caption">Every bounce is a new possibility.</p>`;
}
function drawBlackjack() {
  board.innerHTML = '<div class="blackjack-table"><p class="hand-label" id="dealer-label">DEALER</p><div class="hand" id="dealer-hand"><div class="playing-card back">✦</div><div class="playing-card back">✦</div></div><p class="table-rule">BLACKJACK PAYS 3:2</p><p class="hand-label" id="player-label">YOUR HAND</p><div class="hand" id="player-hand"><div class="playing-card back">✦</div><div class="playing-card back">✦</div></div><div class="blackjack-actions"><button id="hit-button" class="button" type="button" disabled>Hit</button><button id="stand-button" class="button" type="button" disabled>Stand</button></div></div>';
}
function drawDice() {
  board.innerHTML = '<div class="dice-result" id="dice-result">50.00</div><p class="board-caption" id="dice-condition">Roll under 50 to win</p><div class="dice-track"><span class="dice-marker"></span></div><div class="dice-range-labels"><span>0</span><span>50</span><span>99.99</span></div>';
  updateDiceTarget();
}
function updateDiceTarget() {
  if (!$('#dice-target')) return;
  const target = Number($('#dice-target').value);
  $('#dice-target-label').textContent = `Roll under ${target} · ${target}% chance`;
  $('#dice-payout').textContent = `Winning return: ${(97 / target).toFixed(2)}×`;
  $('#dice-condition').textContent = `Roll under ${target} to win`;
  $('.dice-track').style.background = `linear-gradient(90deg,#35b896 ${target}%,#963e5a ${target}%)`;
}
function openGame(id) {
  const game = games.find(item => item.id === id);
  if (!game) return;
  if (dialog.open && currentGame?.id === id) return;
  if (active || busy) return;
  currentGame = game;
  gameOpener = document.activeElement;
  $('#game-title').textContent = game.name;
  $('#game-instructions').textContent = game.instructions;
  $('#game-options').innerHTML = '';
  if (id === 'mines') $('#game-options').innerHTML = optionSelect('mine-count', 'Number of mines', [[3, '3 mines'], [1, '1 mine'], [5, '5 mines'], [10, '10 mines']]);
  if (id === 'coinflip') $('#game-options').innerHTML = optionSelect('coin-choice', 'Your call', [['heads', 'Heads'], ['tails', 'Tails']]);
  if (id === 'dice') $('#game-options').innerHTML = '<label for="dice-target" id="dice-target-label">Roll under 50 · 50% chance</label><input id="dice-target" type="range" min="5" max="95" step="1" value="50"><p class="game-instructions" id="dice-payout">Winning return: 1.94×</p>';
  ({ mines: drawMines, towers: drawTowers, coinflip: drawCoin, plinko: drawPlinko, blackjack: drawBlackjack, dice: drawDice })[id]();
  setStatus('Ready when you are.');
  lockControls(false);
  playButton.textContent = id === 'blackjack' ? 'Deal cards' : id === 'plinko' ? 'Drop ball' : 'Play';
  cashoutButton.hidden = true;
  $('#close-game').disabled = false;
  $('#dialog-balance').textContent = format(balance);
  if (!dialog.open) dialog.showModal();
  closeSidebar();
}
function closeGame() {
  if (busy) { setStatus('Your round is finishing. One moment…'); return; }
  if (active && currentGame.id === 'blackjack') standBlackjack();
  else if (active) {
    const multiplier = active.picks ? active.multiplier : 1;
    finish(multiplier, active.picks ? 'Collected before leaving.' : 'Unplayed round refunded.');
  }
  dialog.close();
  if (location.hash.startsWith('#play/')) window.history.replaceState(null, '', '#games');
  route();
  if (gameOpener instanceof HTMLElement) gameOpener.focus();
}
function startMines() {
  drawMines();
  const mineCount = Number($('#mine-count').value);
  active.mines = new Set(shuffle(Array.from({ length: 25 }, (_, i) => i)).slice(0, mineCount));
  active.picks = 0;
  active.multiplier = 1;
  board.querySelectorAll('.tile').forEach(tile => { tile.disabled = false; });
  setStatus('Pick a tile to find your first gem.');
}
function revealMines(selected) {
  board.querySelectorAll('.tile').forEach(tile => {
    const index = Number(tile.dataset.tile);
    if (!tile.classList.contains('safe') && index !== selected) tile.classList.add('revealed');
    tile.classList.add(active.mines.has(index) ? 'bomb' : 'safe');
    tile.textContent = active.mines.has(index) ? '✹' : '◆';
    tile.disabled = true;
    tile.setAttribute('aria-label', `Tile ${index + 1}: ${active.mines.has(index) ? 'mine' : 'gem'}`);
  });
}
function pickMine(tile) {
  if (!active || tile.disabled) return;
  const index = Number(tile.dataset.tile);
  if (active.mines.has(index)) {
    revealMines(index);
    finish(0, 'You found a mine.');
    return;
  }
  active.picks++;
  tile.disabled = true;
  tile.classList.add('safe');
  tile.textContent = '◆';
  tile.setAttribute('aria-label', `Tile ${index + 1}: gem`);
  let probability = 1;
  for (let i = 0; i < active.picks; i++) probability *= (25 - active.mines.size - i) / (25 - i);
  active.multiplier = 0.97 / probability;
  if (active.picks === 25 - active.mines.size) {
    revealMines(index);
    finish(active.multiplier, 'Every gem found!');
    return;
  }
  cashoutButton.hidden = false;
  cashoutButton.textContent = `Collect ${format(round(active.stake * active.multiplier))}`;
  setStatus(`${active.picks} gem${active.picks === 1 ? '' : 's'} found · ${active.multiplier.toFixed(2)}×. Keep going or collect.`);
}
function startTowers() {
  drawTowers();
  active.bombs = Array.from({ length: 8 }, () => randomInt(3));
  active.picks = 0;
  active.multiplier = 1;
  enableTowerRow();
  setStatus('Choose a tile on the bottom row.');
}
function enableTowerRow() {
  board.querySelectorAll('[data-row]').forEach(tile => {
    const isCurrent = Number(tile.dataset.row) === active.picks;
    tile.disabled = !isCurrent;
    tile.classList.toggle('current', isCurrent);
  });
}
function pickTower(tile) {
  if (!active || tile.disabled) return;
  const row = Number(tile.dataset.row);
  const col = Number(tile.dataset.col);
  tile.classList.remove('current');
  if (active.bombs[row] === col) {
    tile.classList.add('bomb'); tile.textContent = '✕';
    board.querySelectorAll('.tile').forEach(item => { item.disabled = true; item.classList.remove('current'); });
    finish(0, 'That tile gave way.');
    return;
  }
  tile.classList.add('safe'); tile.textContent = '◆';
  active.picks++;
  active.multiplier = 0.97 * (1.5 ** active.picks);
  if (active.picks === 8) {
    board.querySelectorAll('.tile').forEach(item => { item.disabled = true; item.classList.remove('current'); });
    finish(active.multiplier, 'You reached the top!');
    return;
  }
  enableTowerRow();
  cashoutButton.hidden = false;
  cashoutButton.textContent = `Collect ${format(round(active.stake * active.multiplier))}`;
  setStatus(`Level ${active.picks} cleared · ${active.multiplier.toFixed(2)}×. Climb or collect.`);
}
function startCoin() {
  drawCoin();
  const choice = $('#coin-choice').value;
  const result = randomInt(2) ? 'heads' : 'tails';
  busy = true; $('#close-game').disabled = true;
  $('.coin-face').classList.add('flipping');
  $('#coin-result').textContent = 'In the air…';
  setStatus('Flipping the coin…');
  setTimeout(() => {
    $('.coin-face').classList.remove('flipping');
    $('.coin-face').textContent = result === 'heads' ? 'H' : 'T';
    $('#coin-result').textContent = result === 'heads' ? 'Heads' : 'Tails';
    finish(choice === result ? 1.95 : 0, choice === result ? 'Good call!' : 'The other side this time.');
  }, 1000);
}
function startPlinko() {
  drawPlinko();
  busy = true; $('#close-game').disabled = true;
  const path = Array.from({ length: 8 }, () => randomInt(2));
  let rights = 0;
  const ball = $('.plinko-ball');
  setStatus('Let’s see where it lands…');
  function bounce(step) {
    if (step === 8) {
      ball.style.top = '244px';
      ball.style.left = `calc(${(rights + 0.5) / 9 * 100}% - 7px)`;
      setTimeout(() => {
        $('.plinko-slots').children[rights].classList.add('landed');
        finish(slots[rights], `Landed on ${slots[rights]}×.`);
      }, 170);
      return;
    }
    rights += path[step];
    ball.style.top = `${28 + step * 27}px`;
    ball.style.left = `calc(50% + ${(rights - (step + 1) / 2) * 33 - 7}px)`;
    setTimeout(() => bounce(step + 1), 150);
  }
  bounce(0);
}
function cardValue(hand) {
  let score = 0, aces = 0;
  for (const card of hand) { score += card.rank === 'A' ? 11 : ['K', 'Q', 'J'].includes(card.rank) ? 10 : Number(card.rank); if (card.rank === 'A') aces++; }
  while (score > 21 && aces > 0) { score -= 10; aces--; }
  return score;
}
function cardHTML(card) { return `<div class="playing-card ${['♥', '♦'].includes(card.suit) ? 'red' : ''}" aria-label="${card.rank} ${card.suit}"><span>${card.rank}</span><span>${card.suit}</span></div>`; }
function renderHands(revealDealer = false) {
  $('#player-hand').innerHTML = active.player.map(cardHTML).join('');
  $('#dealer-hand').innerHTML = revealDealer ? active.dealer.map(cardHTML).join('') : `${cardHTML(active.dealer[0])}<div class="playing-card back" aria-label="Face down card">✦</div>`;
  $('#player-label').textContent = `YOUR HAND · ${cardValue(active.player)}`;
  $('#dealer-label').textContent = revealDealer ? `DEALER · ${cardValue(active.dealer)}` : 'DEALER · ?';
}
function endBlackjack(multiplier, message) {
  renderHands(true);
  $('#hit-button').disabled = true;
  $('#stand-button').disabled = true;
  finish(multiplier, message);
}
function startBlackjack() {
  drawBlackjack();
  active.deck = shuffle(['♠', '♥', '♦', '♣'].flatMap(suit => ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].map(rank => ({ rank, suit }))));
  active.player = [active.deck.pop(), active.deck.pop()];
  active.dealer = [active.deck.pop(), active.deck.pop()];
  renderHands();
  const playerNatural = cardValue(active.player) === 21;
  const dealerNatural = cardValue(active.dealer) === 21;
  if (playerNatural || dealerNatural) {
    endBlackjack(playerNatural && dealerNatural ? 1 : playerNatural ? 2.5 : 0, playerNatural && dealerNatural ? 'Two blackjacks. Push.' : playerNatural ? 'Blackjack!' : 'Dealer has blackjack.');
    return;
  }
  $('#hit-button').disabled = false;
  $('#stand-button').disabled = false;
  setStatus(`You have ${cardValue(active.player)}. Hit for another card or stand.`);
}
function hitBlackjack() {
  if (!active || currentGame.id !== 'blackjack') return;
  active.player.push(active.deck.pop());
  renderHands();
  const score = cardValue(active.player);
  if (score > 21) endBlackjack(0, `Bust at ${score}.`);
  else if (score === 21) standBlackjack();
  else setStatus(`You have ${score}. Hit or stand?`);
}
function standBlackjack() {
  if (!active || currentGame.id !== 'blackjack') return;
  while (cardValue(active.dealer) < 17) active.dealer.push(active.deck.pop());
  const player = cardValue(active.player), dealer = cardValue(active.dealer);
  if (dealer > 21) endBlackjack(2, `Dealer busts at ${dealer}. You win!`);
  else if (player > dealer) endBlackjack(2, `${player} beats ${dealer}. You win!`);
  else if (player === dealer) endBlackjack(1, `Both have ${player}. Push.`);
  else endBlackjack(0, `Dealer’s ${dealer} beats ${player}.`);
}
function startDice() {
  const target = Number($('#dice-target').value);
  const result = randomInt(10000) / 100;
  busy = true; $('#close-game').disabled = true;
  setStatus('Rolling…');
  $('#dice-result').textContent = '···';
  setTimeout(() => {
    $('#dice-result').textContent = result.toFixed(2);
    $('#dice-result').style.color = result < target ? '#58dfb1' : '#ee91b1';
    $('.dice-marker').style.left = `${result}%`;
    finish(result < target ? 97 / target : 0, result < target ? `${result.toFixed(2)} is under ${target}. You win!` : `${result.toFixed(2)} is not under ${target}.`);
  }, 600);
}
function collect() {
  if (!active || !active.picks) return;
  if (currentGame.id === 'mines') revealMines(-1);
  else board.querySelectorAll('.tile').forEach(tile => { tile.disabled = true; tile.classList.remove('current'); });
  finish(active.multiplier, 'Collected!');
}
function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#sidebar-scrim').hidden = true;
  $('#menu-button').setAttribute('aria-expanded', 'false');
  $('#sidebar').inert = window.matchMedia('(max-width: 760px)').matches;
}
function route() {
  const hash = location.hash.slice(1) || 'home';
  const match = hash.match(/^play\/(mines|towers|coinflip|plinko|blackjack|dice)$/);
  if (match) openGame(match[1]);
  else if (dialog.open) {
    if (busy) { window.history.replaceState(null, '', `#play/${currentGame.id}`); return; }
    closeGame();
  }
  const nav = match ? match[1] : hash;
  document.querySelectorAll('[data-nav]').forEach(link => {
    const selected = link.dataset.nav === nav;
    link.classList.toggle('active', selected);
    if (selected) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  $('#page-label').textContent = match ? currentGame.name : hash === 'history' ? 'Play history' : hash === 'games' ? 'All games' : 'Home';
  closeSidebar();
}

$('#games-grid').innerHTML = games.map(game => `<a class="game-card" href="#play/${game.id}" aria-label="Play ${game.name}"><div class="card-art"><div class="card-image" style="--art-x:${game.x}%;--art-y:${game.y}%"></div><span class="card-brand">✦ IDK ORIGINALS</span><span class="card-title">${game.name.toUpperCase()}</span><span class="card-play" aria-hidden="true"><span>▶</span></span></div><div class="card-caption"><strong>${game.detail}</strong><span>Free play</span></div></a>`).join('');
$('#game-nav').innerHTML = games.map(game => `<a class="nav-item" href="#play/${game.id}" data-nav="${game.id}"><span>${game.icon}</span>${game.name}</a>`).join('');
$('#game-controls').addEventListener('submit', event => {
  event.preventDefault();
  if (!begin()) return;
  ({ mines: startMines, towers: startTowers, coinflip: startCoin, plinko: startPlinko, blackjack: startBlackjack, dice: startDice })[currentGame.id]();
});
board.addEventListener('click', event => {
  const tile = event.target.closest('.tile');
  if (tile && currentGame.id === 'mines') pickMine(tile);
  if (tile && currentGame.id === 'towers') pickTower(tile);
  if (event.target.closest('#hit-button')) hitBlackjack();
  if (event.target.closest('#stand-button')) standBlackjack();
});
$('#game-options').addEventListener('input', event => { if (event.target.id === 'dice-target') updateDiceTarget(); });
$('#half-wager').addEventListener('click', () => { $('#wager').value = Math.max(1, Math.floor(Number($('#wager').value) / 2)); });
$('#double-wager').addEventListener('click', () => { $('#wager').value = Math.min(1000000, Math.floor(balance), Math.max(1, Number($('#wager').value) * 2)); });
cashoutButton.addEventListener('click', collect);
$('#close-game').addEventListener('click', closeGame);
dialog.addEventListener('cancel', event => { event.preventDefault(); closeGame(); });
$('#refill-button').addEventListener('click', refill);
$('#perk-refill').addEventListener('click', refill);
$('#how-button').addEventListener('click', () => { closeSidebar(); $('#info-dialog').showModal(); });
$('#game-rules-button').addEventListener('click', () => $('#info-dialog').showModal());
$('#close-info').addEventListener('click', () => $('#info-dialog').close());
$('#info-done').addEventListener('click', () => $('#info-dialog').close());
$('#menu-button').addEventListener('click', () => {
  const isOpen = $('#sidebar').classList.toggle('open');
  $('#sidebar-scrim').hidden = !isOpen;
  $('#menu-button').setAttribute('aria-expanded', String(isOpen));
  $('#sidebar').inert = !isOpen;
});
window.matchMedia('(max-width: 760px)').addEventListener('change', closeSidebar);
$('#sidebar-scrim').addEventListener('click', closeSidebar);
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeSidebar(); });
document.querySelectorAll('.history-tab').forEach(button => button.addEventListener('click', () => {
  historyFilter = button.dataset.filter;
  document.querySelectorAll('.history-tab').forEach(tab => { const selected = tab === button; tab.classList.toggle('active', selected); tab.setAttribute('aria-pressed', String(selected)); });
  renderHistory();
}));
window.addEventListener('hashchange', route);
updateBalance();
renderHistory();
route();
