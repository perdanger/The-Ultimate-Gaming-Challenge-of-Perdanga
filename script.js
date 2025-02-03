// Global variables
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const progressBar = document.getElementById('progressBar');
let spinTimeout = null;
let angle = 0;
let spinTimeTotal = 0;
let spinTime = 0;
let isSpinning = false;
let currentAvailableGames = [];

// Array of players; each object: { name, games: [], result }
let players = [];

/* Modal functions */
function openRulesModal() {
  document.getElementById('rulesModal').classList.add('active');
}

function closeRulesModal() {
  document.getElementById('rulesModal').classList.remove('active');
}

/* Canvas resize */
function resizeCanvas() {
  const size = Math.min(document.querySelector('.wheel-container').offsetWidth, 400);
  canvas.width = canvas.height = size;
  drawWheel(currentAvailableGames);
}
window.addEventListener('resize', resizeCanvas);

/* Управление видимостью блока выбора игрока */
function togglePlayerSelectionVisibility() {
  const playerSelectionBlock = document.querySelector('.player-selection-sidebar');
  if (players.length === 0) {
    playerSelectionBlock.style.display = 'none';
  } else {
    playerSelectionBlock.style.display = 'block';
  }
}

/* Player functions */
function addPlayer() {
  const nameInput = document.getElementById('playerNameInput');
  const playerName = nameInput.value.trim();
  if (playerName && !players.some(p => p.name === playerName)) {
    players.push({ name: playerName, games: [], result: '' });
    nameInput.value = '';
    updatePlayerSelect();
    // Устанавливаем выбранного игрока в селекте боковой панели
    document.getElementById('playerSelectSidebar').value = playerName;
    onPlayerSelectChange(document.getElementById('playerSelectSidebar'));
  }
}

function removePlayer(index) {
  players.splice(index, 1);
  updatePlayerSelect();
  if (players.length > 0) {
    const newSelected = players[0].name;
    document.getElementById('playerSelectSidebar').value = newSelected;
    onPlayerSelectChange(document.getElementById('playerSelectSidebar'));
  } else {
    onPlayerSelectChange({ value: '' });
  }
}

function updatePlayerSelect() {
  const selectSidebar = document.getElementById('playerSelectSidebar');
  let optionsHTML = "";
  players.forEach(player => {
    optionsHTML += `<option value="${player.name}">${player.name}</option>`;
  });
  selectSidebar.innerHTML = optionsHTML;
  togglePlayerSelectionVisibility();
}

function deleteSelectedPlayer() {
  const selectSidebar = document.getElementById('playerSelectSidebar');
  const selectedName = selectSidebar.value;
  if (!selectedName) return;
  const index = players.findIndex(p => p.name === selectedName);
  if (index !== -1) {
    removePlayer(index);
  }
}

function onPlayerSelectChange(changedSelect) {
  const selectSidebar = document.getElementById('playerSelectSidebar');
  const selectedName = changedSelect.value;
  // Обновляем видимость блока добавления игр
  const playerGameControls = document.getElementById('playerGameControls');
  if (selectedName) {
    playerGameControls.style.display = 'block';
    updatePlayerGameList(selectedName);
  } else {
    playerGameControls.style.display = 'none';
  }
  // Обновляем список доступных игр
  if (players.length === 1) {
    currentAvailableGames = players[0].games.slice();
  } else {
    currentAvailableGames = getAvailableGamesFor(selectedName);
  }
  drawWheel(currentAvailableGames);
  updateSpinButtonState();
}

function addPlayerGame() {
  const selectedName = document.getElementById('playerSelectSidebar').value;
  const input = document.getElementById('playerGameInput');
  let gameName = input.value.trim();
  const maxLength = 20;
  if (gameName.length > maxLength) {
    gameName = gameName.slice(0, maxLength - 3) + '...';
  }
  if (!gameName) return;
  const player = players.find(p => p.name === selectedName);
  if (player.games.length >= 3) {
    alert("You can add up to 3 games.");
    return;
  }
  if (!player.games.includes(gameName)) {
    player.games.push(gameName);
    input.value = '';
    updatePlayerGameList(selectedName);
    if (players.length === 1) {
      currentAvailableGames = player.games.slice();
    } else {
      currentAvailableGames = getAvailableGamesFor(selectedName);
    }
    drawWheel(currentAvailableGames);
    updateSpinButtonState();
    updateResultTable();
  }
}

function removePlayerGame(playerName, gameIndex) {
  const player = players.find(p => p.name === playerName);
  if (player) {
    player.games.splice(gameIndex, 1);
    updatePlayerGameList(playerName);
    if (players.length === 1) {
      currentAvailableGames = player.games.slice();
    } else {
      currentAvailableGames = getAvailableGamesFor(playerName);
    }
    drawWheel(currentAvailableGames);
    updateSpinButtonState();
  }
}

function updatePlayerGameList(playerName) {
  const player = players.find(p => p.name === playerName);
  const listDiv = document.getElementById('playerGameList');
  listDiv.innerHTML = '';
  if (player) {
    player.games.forEach((game, index) => {
      const div = document.createElement('div');
      div.className = 'player-game-item';
      const color = `hsl(${(index * 360 / Math.max(player.games.length, 1)).toFixed(0)}, 70%, 50%)`;
      div.innerHTML = `<span style="--underline-color: ${color}">${game}</span>
                       <button onclick="removePlayerGame('${player.name}', ${index})">Remove</button>`;
      listDiv.appendChild(div);
    });
  }
}

function getAvailableGamesFor(playerName) {
  let available = [];
  players.forEach(p => {
    if (p.name !== playerName) {
      available = available.concat(p.games);
    }
  });
  return available;
}

/* Wheel functions */
function updateSpinButtonState() {
  const spinButton = document.getElementById('spinButton');
  spinButton.disabled = isSpinning || (currentAvailableGames.length === 0);
}

function getTextColor() {
  return document.body.classList.contains('dark-mode') ? '#fff' : '#333';
}

function drawCenteredText(ctx, text, x, y, angle, maxWidth) {
  const maxFontSize = 24;
  const minFontSize = 10;
  let fontSize = maxFontSize;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-angle);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = getTextColor();
  while (fontSize >= minFontSize) {
    ctx.font = `${fontSize}px Montserrat`;
    if (ctx.measureText(text).width <= maxWidth) break;
    fontSize--;
  }
  if (ctx.measureText(text).width > maxWidth) {
    const ellipsis = '...';
    let truncatedText = text;
    while (ctx.measureText(truncatedText + ellipsis).width > maxWidth && truncatedText.length > 0) {
      truncatedText = truncatedText.slice(0, -1);
    }
    text = truncatedText + ellipsis;
  }
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawWheel(availableGames) {
  const numGames = availableGames.length;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (numGames === 0) return;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 30;
  if (numGames === 1) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(0, 70%, 50%)`;
    ctx.fill();
    ctx.closePath();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = getTextColor();
    ctx.font = `${Math.min(24, radius / 5)}px Montserrat`;
    ctx.fillText(availableGames[0], centerX, centerY);
  } else if (numGames === 2) {
    const halfArc = Math.PI;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, i * halfArc, (i + 1) * halfArc);
      ctx.closePath();
      ctx.fillStyle = `hsl(${(i * 360 / 2)}, 70%, 50%)`;
      ctx.fill();
      const textAngle = i * halfArc + halfArc / 2;
      const textX = centerX + Math.cos(textAngle) * (radius / 2);
      const textY = centerY + Math.sin(textAngle) * (radius / 2);
      drawCenteredText(ctx, availableGames[i], textX, textY, textAngle, radius / 2);
    }
  } else {
    const arc = Math.PI * 2 / numGames;
    const points = [];
    for (let i = 0; i < numGames; i++) {
      const x = centerX + radius * Math.cos(i * arc);
      const y = centerY + radius * Math.sin(i * arc);
      points.push({ x, y });
    }
    for (let i = 0; i < numGames; i++) {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(points[i].x, points[i].y);
      ctx.lineTo(points[(i + 1) % numGames].x, points[(i + 1) % numGames].y);
      ctx.closePath();
      ctx.fillStyle = `hsl(${(i * 360 / numGames)}, 70%, 50%)`;
      ctx.fill();
      const textAngle = i * arc + arc / 2;
      const textX = centerX + Math.cos(textAngle) * (radius * 0.65);
      const textY = centerY + Math.sin(textAngle) * (radius * 0.65);
      drawCenteredText(ctx, availableGames[i], textX, textY, textAngle, radius * 0.5);
    }
  }
}

function spinWheel() {
  spinTime += 30;
  if (spinTime >= spinTimeTotal) {
    stopSpin();
    return;
  }
  const progress = spinTime / spinTimeTotal;
  const easing = t => 1 - Math.pow(1 - t, 3);
  const spinAngle = Math.min(360, (spinTimeTotal - spinTime) / spinTimeTotal * 360);
  angle += easing(progress) * spinAngle * Math.PI / 180;
  drawRotatedWheel();
  progressBar.style.width = (progress * 100) + "%";
  const remainingTime = Math.max(0, (spinTimeTotal - spinTime) / 1000).toFixed(1);
  document.getElementById('timer').textContent = `⏳ ${remainingTime}s`;
  spinTimeout = setTimeout(spinWheel, 30);
}

function drawRotatedWheel() {
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(angle);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);
  drawWheel(currentAvailableGames);
  ctx.restore();
}

function startSpin() {
  if (isSpinning) return;
  const selectedName = document.getElementById('playerSelectSidebar').value;
  if (players.length === 1) {
    currentAvailableGames = players[0].games.slice();
  } else {
    currentAvailableGames = getAvailableGamesFor(selectedName);
  }
  if (currentAvailableGames.length === 0) {
    alert("No available games for this player.");
    return;
  }
  isSpinning = true;
  updateSpinButtonState();
  spinTimeTotal = parseInt(document.getElementById('spinTime').value) * 1000;
  spinTime = 0;
  angle = 0;
  const randomSpin = Math.floor(Math.random() * 360) + 1080;
  angle = randomSpin * Math.PI / 180;
  spinWheel();
}

function stopSpin() {
  clearTimeout(spinTimeout);
  // Звуковые эффекты удалены – просто останавливаем вращение
  const numGames = currentAvailableGames.length;
  if (numGames === 0) return;
  const degrees = angle * 180 / Math.PI + 90;
  const arc = Math.PI * 2 / numGames;
  const index = Math.floor((360 - (degrees % 360)) / (arc * 180 / Math.PI)) % numGames;
  const resultGame = currentAvailableGames[index];
  document.getElementById('result').textContent = `Winner: ${resultGame}`;

  const selectedName = document.getElementById('playerSelectSidebar').value;
  const player = players.find(p => p.name === selectedName);
  if (player) {
    player.result = resultGame;
  }
  updateResultTable();
  document.getElementById('timer').textContent = `⏳ 0s`;
  progressBar.style.width = "0%";
  isSpinning = false;
  updateSpinButtonState();
}

function updateResultTable() {
  const tbody = document.getElementById('resultTableBody');
  tbody.innerHTML = '';
  players.forEach(player => {
    const gamesList = player.games.length ? player.games.join(', ') : '-';
    let color = '';
    if (player.result) {
      const index = currentAvailableGames.indexOf(player.result);
      color = index >= 0 ? `hsl(${(index * 360 / currentAvailableGames.length).toFixed(0)},70%,50%)` : '#000';
    }
    const steamLink = player.result 
      ? `https://store.steampowered.com/search/?term=${encodeURIComponent(player.result)}`
      : '#';
    const steamButtonHTML = player.result 
      ? `<a href="${steamLink}" target="_blank"><button class="steam-button">Steam</button></a>` 
      : '-';
    const hltbLink = player.result 
      ? `https://howlongtobeat.com/?q=${encodeURIComponent(player.result)}`
      : '#';
    const hltbButtonHTML = player.result 
      ? `<a href="${hltbLink}" target="_blank"><button class="hltb-button">HowLongToBeat</button></a>`
      : '-';
      
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${player.name}</td>
                    <td>${gamesList}</td>
                    <td><span style="--underline-color: ${color}">${player.result || '-'}</span></td>
                    <td>${steamButtonHTML}</td>
                    <td>${hltbButtonHTML}</td>`;
    tbody.appendChild(tr);
  });
}

window.onload = () => {
  resizeCanvas();
  updatePlayerSelect();
  onPlayerSelectChange({ value: '' });
  
  // После полной загрузки и первичной инициализации делаем страницу видимой
  document.body.style.opacity = "1";

  // Обработчики нажатия Enter для полей ввода
  document.getElementById('playerNameInput').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addPlayer();
    }
  });
  document.getElementById('playerGameInput').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addPlayerGame();
    }
  });
  document.getElementById('spinTime').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      startSpin();
    }
  });
};

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const themeButton = document.getElementById('themeToggleButton');
  if (document.body.classList.contains('dark-mode')) {
    themeButton.textContent = "OFF 🌙";
    themeButton.style.backgroundColor = "var(--primary-color)";
  } else {
    themeButton.textContent = "ON ☀️";
    themeButton.style.backgroundColor = "var(--primary-color-hover)";
  }
  drawWheel(currentAvailableGames);
}

/* Reset game function */
function resetGame() {
  players = [];
  currentAvailableGames = [];
  updatePlayerSelect();
  document.getElementById('playerSelectSidebar').value = '';
  onPlayerSelectChange(document.getElementById('playerSelectSidebar'));
  angle = 0;
  spinTime = 0;
  isSpinning = false;
  progressBar.style.width = "0%";
  document.getElementById('timer').textContent = `⏳ 0s`;
  document.getElementById('result').textContent = "";
  updateResultTable();
  alert("Game has been reset.");
}
