function saveQueue(el){
	let queue = el.parentNode.parentNode.id.replace("queue", "");
	savedQueues.push(queues[queue].map(q => [q[0]]).filter(q => isNaN(+q) && q[0] != "<"));
	savedQueues[savedQueues.length - 1].icon = possibleActionIcons[0];
	// Generate random colour.
	savedQueues[savedQueues.length - 1].colour = '#'+Math.floor(Math.random()*16777215).toString(16);
	drawSavedQueues();
}

function deleteSavedQueue(el){
	let queue = el.parentNode.parentNode.id.replace("saved-queue", "");
	if (queues.some(q => q.some(a => a[0] == queue))){
		alert("Can't delete; in use.");
		return;
	}
	savedQueues.splice(queue, 1);
	for (let i = 0; i < queues.length; i++){
		for (let j = 0; j < queues[i].length; j++){
			if (!isNaN(+queues[i][j][0]) && queues[i][j][0] > queue) queues[i][j][0]--;
		}
	}
	drawSavedQueues();
}

function selectSavedQueue(event, el){
	if (!event.target.closest("input") && !event.target.closest("select")) el.focus();
}

function insertSavedQueue(event, el){
	if (event.target.closest("input") || event.target.closest("select")) return;

	let source = el.closest('.saved-queue').id.replace("saved-queue", "");

	for (let target of selectedQueue) {
		let queueNode = document.querySelector('#queue'+target+' .queue-inner')
		queues[target].push([source, true, savedQueues[source]]);
		queueNode.append(createQueueActionNode(source));

	}

	el.closest('.saved-queue').blur()
}

function setSavedQueueName(el){
	let queue = el.parentNode.id.replace("saved-queue", "");
	savedQueues[queue].name = el.value;
	updateSavedIcon(queue);
}

function setSavedQueueIcon(el){
	let queue = el.parentNode.id.replace("saved-queue", "");
	savedQueues[queue].icon = el.value;
	updateSavedIcon(queue);
}

function setSavedQueueColour(el){
	let queue = el.parentNode.id.replace("saved-queue", "");
	savedQueues[queue].colour = el.value;
	el.parentNode.querySelector(".icon-select").style.color = el.value;
	updateSavedIcon(queue);
}

function updateSavedIcon(queue){
	document.querySelectorAll(`.action${queue}`).forEach(node => {
		node.style.color = savedQueues[queue].colour;
		node.querySelector(".character").innerHTML = savedQueues[queue].icon;
		node.setAttribute("title", savedQueues[queue].name);
	});
}

function addActionToSavedQueue(action){
	let queueNode = document.querySelector(".saved-queue:focus");
	if (!queueNode) return; // This occurs when we prevent adding actions because we're typing in a name
	let queue = queueNode.id.replace("saved-queue", "");
	if (savedQueues[queue] === undefined) return;
	queueNode = queueNode.querySelector(".queue-inner");
	if (action == "B") {
		if (savedQueues[queue].length == 0) return;
		savedQueues[queue].pop();
		queueNode.removeChild(queueNode.lastChild);
	} else if ("UDLRI=".includes(action) || (action[0] == "N" && !isNaN(+action[1]))) {
		savedQueues[queue].push([action, true]);
		queueNode.append(createActionNode(action));
	}
}

function startSavedQueueDrag(event, el){
	event.dataTransfer.setDragImage(el.querySelector(".icon-select"), 0, 0);
	event.dataTransfer.setData("text/plain", el.id.replace("saved-queue", ""));
	event.dataTransfer.effectAllowed = "copymove";
}

function queueDragOver(event){
	event.preventDefault();
	event.dataTransfer.dropEffect = "copy";
}

function savedQueueDragOver(event, el){
	event.preventDefault();
	if (el.id.replace("saved-queue", "") == event.dataTransfer.getData("text/plain")){
		event.dataTransfer.dropEffect = "none";
		return;
	}
	if (isDropTopHalf(event)){
		el.closest(".bottom-block").style.borderTop = "2px solid";
		el.closest(".bottom-block").style.borderBottom = "";
	} else {
		el.closest(".bottom-block").style.borderTop = "";
		el.closest(".bottom-block").style.borderBottom = "2px solid";
	}
	event.dataTransfer.dropEffect = "move";
}

function savedQueueDragOut(el){
	el.closest(".bottom-block").style.borderTop = "";
	el.closest(".bottom-block").style.borderBottom = "";
}

function isDropTopHalf(event){
	return event.offsetY < 14;
}

function savedQueueDrop(event, el){
	let source = event.dataTransfer.getData("text/plain");
	let target = el.id.replace("queue", "");
	let queueNode = el.querySelector(".queue-inner");
	if (event.ctrlKey){
		for (let i = 0; i < savedQueues[source].length; i++){
			queues[target].push([savedQueues[source][i], true]);
			queueNode.append(createActionNode(savedQueues[source][i][0]));
		}
	} else {
		queues[target].push([source, true, savedQueues[source]]);
		queueNode.append(createQueueActionNode(source));
	}
}

function savedQueueMove(event, el){
	savedQueueDragOut(el);
	let source = event.dataTransfer.getData("text/plain");
	let target = +el.id.replace("saved-queue", "") + (isDropTopHalf(event) ? -1 : 0);
	if (source > target) target++;
	for (let i = 0; i < queues.length; i++){
		for (let j = 0; j < queues[i].length; j++){
			let value = +queues[i][j][0];
			if (!isNaN(value)){
				if (value > source && value <= target){
					queues[i][j][0]--;
				} else if (value < source && value >= target){
					queues[i][j][0]++;
				} else if (value == source){
					queues[i][j][0] = target;
				}
			}
		}
	}
	let oldQueue = savedQueues.splice(source, 1)[0];
	savedQueues.splice(target, 0, oldQueue);
	drawSavedQueues();
}

function drawSavedQueues(){
	let node = document.querySelector("#saved-queues-inner");
	while (node.firstChild){
		node.removeChild(node.lastChild);
	}
	let template = document.querySelector("#saved-queue-template");
	for (let i = 0; i < savedQueues.length; i++){
		let el = template.cloneNode(true);
		el.id = `saved-queue${i}`;
		let queueNode = el.querySelector(".queue-inner");
		while (queueNode.firstChild) {
			queueNode.remove(queueNode.lastChild);
		}
		for (let j = 0; j < savedQueues[i].length; j++){
			queueNode.append(createActionNode(savedQueues[i][j][0]));
		}
		if (savedQueues[i].name) el.querySelector(".saved-name").value = savedQueues[i].name;
		if (savedQueues[i].icon) el.querySelector(".icon-select").value = savedQueues[i].icon;
		if (savedQueues[i].colour){
			el.querySelector(".colour-select").value = savedQueues[i].colour;
			el.querySelector(".icon-select").style.color = savedQueues[i].colour;
		}
		node.append(el);
	}
	node.parentNode.style.display = savedQueues.length ? "block" : "none";
}

function filterSaved(filterInput){
	if (filterInput.value.length == 0){
		document.querySelectorAll(`.saved-queue`).forEach(queue => queue.style.display = "inline-block");
		return;
	}
	let filter = RegExp(filterInput.value);
	for (let i = 0; i < savedQueues.length; i++){
		if (filter.test(savedQueues[i].name)){
			document.querySelector(`#saved-queue${i}`).style.display = "inline-block";
		} else {
			document.querySelector(`#saved-queue${i}`).style.display = "none";
		}
	}
}
