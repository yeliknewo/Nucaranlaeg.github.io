let possibleActionIcons = ["★", "✣", "✦", "♣", "♠", "⚑", "×", "⬈", "⬉", "⬊", "⬋"];

/******************************************** Functions ********************************************/

function getNextAction(clone = currentClone) {
	let index = queues[clone].findIndex(a => a[1]);
	if (index == -1 || isNaN(+queues[clone][index][0])) return [queues[clone][index], index];
	let action = queues[clone][index];
	if (!action[2]){
		action[2] = savedQueues[action[0]];
	}
	let nextAction = action[2].find(a => a[`${clone}_${index}`] === undefined);
	if (!nextAction) return [undefined, -1];
	return [[nextAction[0], nextAction[`${clone}_${index}`] === undefined], index];
}

function completeNextAction(clone = currentClone) {
	let index = queues[clone].findIndex(a => a[1]);
	let action = queues[clone][index];
	clones[clone].currentCompletions = null;
	if (!action) return;
	if (isNaN(+action[0])){
		action[1] = false;
		return;
	}
	let nextAction = action[2].find(a => a[`${clone}_${index}`] === undefined);
	nextAction[`${clone}_${index}`] = false;
	if (action[2].every(a => a[`${clone}_${index}`] === false)) action[1] = false;
}

function getLocationType(name) {
	return locationTypes.find(a => a.name == name);
}

function getLocationTypeBySymbol(symbol) {
	return locationTypes.find(a => a.symbol == symbol).name;
}

function getMessage(name) {
	return messages.find(a => a.name == name);
}

function getCreature(search) {
	if (typeof(search) == "string") {
		return baseCreatures.find(a => a.name == search);
	} else {
		return creatures.find(c => c.x == search[0] && c.y == search[1]);
	}
}

function writeNumber(value, decimals = 0) {
	if (value > 100) decimals = Math.min(decimals, 1);
	return value.toFixed(decimals);
}

let timeBankNode;

function redrawOptions() {
	timeBankNode = timeBankNode || document.querySelector("#time-banked");
	timeBankNode.innerText = writeNumber(timeBanked / 1000, 1);
}

window.ondrop = e => e.preventDefault();

/******************************************** Prestiges ********************************************/

function resetLoop() {
	let mana = getStat("Mana");
	getMessage("Time Travel").display(mana.base == 5);
	if (mana.base >= 6) getMessage("Strip Mining").display();
	stats.forEach(s => {
		s.reset();
		s.update();
	});
	if (settings.grindMana && routes) {
		Route.loadBestRoute();
	}
	queues.forEach((q, i) => {
		q.forEach(a => {
			a[1] = true;
			a[2] = undefined;
		});
		resetQueueHighlight(i);
	});
	stuff.forEach(s => {
		s.count = 0;
		s.update();
	});
	clones.forEach(c => c.reset());
	queueTime = 0;
	currentActionDetails = null;
	savedQueues = savedQueues.map(q => {
		let [name, icon, colour] = [q.name, q.icon, q.colour];
		q = q.map(a => [a[0]]);
		q.name = name;
		q.icon = icon;
		q.colour = colour;
		return q;
	});
	creatures.forEach(c => {
		c.attack = c.creature.attack;
		c.defense = c.creature.defense;
		c.health = c.creature.health;
	});
	resetMap();
	drawMap();
	save();
	showFinalLocation();
}

/********************************************* Saving *********************************************/

let saveName = (new URL(document.location)).searchParams.get('save') || '';
saveName = `saveGame${saveName && '_'}${saveName}`

function save(){
	let playerStats = stats.map(s => {
		return {
			"name": s.name,
			"base": s.learnable ? s.base : s.getNextLoopValue(),
		};
	});
	let locations = [];
	for (let y = 0; y < mapLocations.length; y++){
		for (let x = 0; x < mapLocations[y].length; x++){
			if (mapLocations[y][x]){
				let loc = mapLocations[y][x];
				locations.push([x - xOffset, y - yOffset, loc.type.reset(loc.completions, loc.priorCompletions)]);
			}
		}
	}
	let cloneData = {
		"count": clones.length,
		"queues": queues.map(queue => {
			return queue.map(q => {
				return q[0];
			});
		}),
	}
	let stored = savedQueues.map(q => {
		return {
			"queue": q,
			"name": q.name,
			"icon": possibleActionIcons.indexOf(q.icon),
			"colour": q.colour,
		};
	});
	let time = {
		"saveTime": Date.now(),
		"timeBanked": timeBanked,
	}
	let messageData = messages.map(m => [m.name, m.displayed]);
	//let savedRoutes = routes.map(r => [r.x, r.y, r.totalTimeAvailable, r.route])
	saveString = JSON.stringify({
		playerStats,
		locations,
		cloneData,
		stored,
		time,
		messageData,
		settings,
		routes,
	});
	localStorage[saveName] = btoa(saveString);
}

function load(){
	if (!localStorage[saveName]) return setup();
	let saveGame = JSON.parse(atob(localStorage[saveName]));
	stats.forEach(s => s.current = 0);
	for (let i = 0; i < saveGame.playerStats.length; i++){
		getStat(saveGame.playerStats[i].name).base = saveGame.playerStats[i].base;
	}
	mapLocations = [];
	while (mapLocations.length < map.length){
		mapLocations.push([]);
	}
	for (let i = 0; i < saveGame.locations.length; i++){
		getMapLocation(saveGame.locations[i][0], saveGame.locations[i][1], true).priorCompletions = saveGame.locations[i][2];
	}
	clones = [];
	while (clones.length < saveGame.cloneData.count){
		clones.push(new Clone(clones.length));
	}
	while (settings.useAlternateArrows != saveGame.settings.useAlternateArrows && saveGame.settings.useAlternateArrows !== undefined) toggleUseAlternateArrows();
	queues = [];
	for (let i = 0; i < saveGame.cloneData.queues.length; i++){
		queues.push(saveGame.cloneData.queues[i].map(q => [q, true]));
	}
	savedQueues = [];
	for (let i = 0; i < saveGame.stored.length; i++){
		savedQueues.push(saveGame.stored[i].queue);
		savedQueues[i].name = saveGame.stored[i].name;
		savedQueues[i].icon = possibleActionIcons[saveGame.stored[i].icon];
		savedQueues[i].colour = saveGame.stored[i].colour;
	}
	ensureLegalQueues();
	drawSavedQueues();
	lastAction = saveGame.time.saveTime;
	timeBanked = saveGame.time.timeBanked;
	for (let i = 0; i < saveGame.messageData.length; i++){
		let message = getMessage(saveGame.messageData[i][0]);
		if (message){
			message.displayed = saveGame.messageData[i][1];
		}
	}
	if (saveGame.routes){
		if (Array.isArray(saveGame.routes[0])) {
			routes = saveGame.routes.map(r => Route.migrateFromArray(r))
		} else {
			routes = Route.fromJSON(saveGame.routes);	
		}
	}

	loadSettings(saveGame.settings);

	selectClone(0);
	redrawQueues();

	// Fix attack and defense
	getStat("Attack").base = 0;
	getStat("Defense").base = 0;
	stats.map(s => s.update());

	drawMap();
	resetLoop();
}

function ensureLegalQueues(){
	for (let i = 0; i < queues.length; i++){
		if (queues[i].some(q => !isNaN(+q[0]) && q[0] >= savedQueues.length)){
			queues[i] = [];
		}
	}
	for (let i = 0; i < savedQueues.length; i++){
		if (savedQueues[i].some(q => !isNaN(+q[0]) && (q[0] >= savedQueues.length || q[0] === null))){
			savedQueues[i].queue = [];
		}
	}
}

function deleteSave(){
	if (localStorage[saveName]) localStorage[saveName + "Backup"] = localStorage[saveName];
	localStorage.removeItem(saveName);
	window.location.reload();
}

function exportGame(){
	navigator.clipboard.writeText(localStorage[saveName]);
}

function importGame(){
	let saveString = prompt("Input your save");
	save();
	save = () => {};
	let temp = localStorage[saveName];
	localStorage[saveName] = saveString;
	try {
		load();
	} catch {
		localStorage[saveName] = temp;
		load();
	}
	window.location.reload();
}

function queueToString(queue){
	return queue.map(q => {
		return isNaN(+q[0]) ? q[0] : queueToString(savedQueues[q[0]]);
	}).join("");
}

function stringToQueue(string){
	let queue = [];
	for (let i = 0; i < string.length; i++){
		if (string[i] == "N"){
			queue.push([string.slice(i, i+2), false]);
			i++;
		} else {
			queue.push([string.slice(i, i+1), false]);
		}
	}
	return queue;
}

function exportQueues(){
	let exportString = queues.map(queue => queueToString(queue));
	navigator.clipboard.writeText(JSON.stringify(exportString));
}

function importQueues(){
	let queueString = prompt("Input your queues");
	let tempQueues = queues.slice();
	try {
		let newQueues = JSON.parse(queueString);
		if (newQueues.length > queues.length){
			alert("Could not import queues - too many queues.")
			return;
		}
		newQueues = newQueues.map(q => stringToQueue(q));
		for (let i = 0; i < queues.length; i++){
			queues[i] = newQueues[i] || [];
		}
		redrawQueues();
	} catch {
		alert("Could not import queues.");
		queues = tempQueues;
	}
}



/******************************************** Game loop ********************************************/

let lastAction = Date.now();
let timeBanked = 0;
let queueTime = 0;
let queuesNode;
let queueTimeNode;
let currentClone = 0;
let fps = 60;

setInterval(function mainLoop() {
	let time = Date.now() - lastAction;
	let mana = getStat("Mana");
	lastAction = Date.now();
	queuesNode = queuesNode || document.querySelector("#queues");
	if (mana.current == 0){
		queuesNode.classList.add("out-of-mana")
		getMessage("Out of Mana").display();
		if (settings.autoRestart == 2 || (settings.autoRestart == 1 && clones.every(c => c.repeated))){
			resetLoop();
		}
	} else {
		queuesNode.classList.remove("out-of-mana")
	}
	if (!settings.running || mana.current == 0 || (settings.autoRestart == 0 && queues.some((q, i) => getNextAction(i)[0] === undefined)) || (settings.autoRestart == 3 && queues.every((q, i) => getNextAction(i)[0] === undefined))){
		timeBanked += time / 2;
		redrawOptions();
		updateDropTarget();
		return;
	}
	let timeAvailable = time;
	if (settings.usingBankedTime && timeBanked > 0){
		let speedMultiplier = settings.debug_speedMultiplier || 10;
		timeAvailable = Math.min(time + timeBanked, time * speedMultiplier);
	}
	if (timeAvailable > 1000) {
		timeAvailable = 1000;
	}
	if (timeAvailable > mana.current * 1000){
		timeAvailable = mana.current * 1000;
	}
	if (timeAvailable < 0) {
		timeAvailable = 0;
	}
	let timeLeft = timeAvailable;

	timeLeft = Clone.performActions(timeAvailable);

	let timeUsed = timeAvailable - timeLeft;
	if (timeUsed > time) {
		timeBanked -= timeUsed - time;
	} else {
		timeBanked += (time - timeUsed) / 2;
	}
	mana.spendMana(timeUsed / 1000);
	if (timeLeft && (settings.autoRestart == 1 || settings.autoRestart == 2)){
		resetLoop();
	}
	queueTimeNode = queueTimeNode || document.querySelector("#time-spent");
	queueTimeNode.innerText = writeNumber(queueTime / 1000, 1);
	redrawOptions();
	updateDropTarget();

	stats.forEach(e=>e.update());
	drawMap();
}, Math.floor(1000 / fps));

function setup(){
	clones.push(new Clone(clones.length));
	selectClone(0);
	getMapLocation(0,0);
	drawMap();
	getMessage("Welcome to Cavernous!").display();
}

/****************************************** Key Bindings ******************************************/

let keyFunctions = {
	"ArrowLeft": () => {
		addActionToQueue("L");
	},
	"ArrowUp": () => {
		addActionToQueue("U");
	},
	"ArrowRight": () => {
		addActionToQueue("R");
	},
	"ArrowDown": () => {
		addActionToQueue("D");
	},
	"Space": e => {
		addActionToQueue("I");
	},
	"Backspace": e => {
		addActionToQueue("B");
		if (e.ctrlKey){
			clearQueue();
		}
	},
	"^Backspace": e => {
		addActionToQueue("B");
		if (e.ctrlKey) {
			clearQueue();
		}
	},
	"KeyW": () => {
		if (settings.useWASD){
			addActionToQueue("U");
		} else {
			toggleAutoRestart();
		}
	},
	"KeyA": () => {
		if (settings.useWASD){
			addActionToQueue("L");
		}
	},
	"KeyS": () => {
		if (settings.useWASD){
			addActionToQueue("D");
		}
	},
	"KeyD": () => {
		if (settings.useWASD){
			addActionToQueue("R");
		}
	},
	"KeyR": () => {
		resetLoop();
	},
	"KeyP": () => {
		toggleRunning();
	},
	"KeyB": () => {
		toggleBankedTime();
	},
	"KeyG": () => {
		toggleGrindMana();
	},
	"Tab": e => {
		selectClone((selectedQueue[selectedQueue.length - 1] + 1) % clones.length);
		e.stopPropagation();
	},
	">Tab": e => {
		selectClone((clones.length + selectedQueue[selectedQueue.length - 1] - 1) % clones.length);
		e.stopPropagation();
	},
	"^KeyA": () => {
		clones[0].select();
		clones.slice(1).map(e => e.select(true));
	},
	"KeyC": () => {
		if (settings.useWASD){
			toggleAutoRestart();
		}
	},
	"End": () => {
		cursor[1] = null;
		showCursor();
	},
	"Digit1": () => {
		addActionToQueue("N0");
	},
	"Digit2": () => {
		addActionToQueue("N1");
	},
	"Digit3": () => {
		addActionToQueue("N2");
	},
	"Equal" : () => {
		addActionToQueue("=");
	},
};

setTimeout(() => {
	let templateSelect = document.querySelector("#saved-queue-template .icon-select");
	for (let i = 0; i < possibleActionIcons.length; i++){
		let el = document.createElement("option");
		el.value = possibleActionIcons[i];
		el.innerHTML = possibleActionIcons[i];
		templateSelect.append(el);
	}
	document.body.onkeydown = e => {
		hideMessages();
		if (!document.querySelector("input:focus")) {
			let key = `${e.ctrlKey ? '^' : ''}${e.shiftKey ? '>' : ''}${e.code}`;
			if (keyFunctions[key]){
				e.preventDefault();
				keyFunctions[key](e);
			}
		}
	};
	load();
}, 10);
