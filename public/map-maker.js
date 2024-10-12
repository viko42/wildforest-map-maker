/**
 * Items: Images that can be used in the map
 */

const optionsContainer = document.getElementById('options');
const mapCanvas = document.getElementById('map');
const ctx = mapCanvas.getContext('2d');

// Set fixed map size
const mapAspectRatio = 958.2 / 481.8;
const mapWidth = 600 * 1.5; // Fixed width
const mapHeight = mapWidth / mapAspectRatio; // Calculated height

// Resize map based on screen size
function resizeMap() {
    mapCanvas.width = mapWidth;
    mapCanvas.height = mapHeight;
    drawMap();
}

// Draw the map
function drawMap() {
    ctx.fillStyle = '#8fbc8f'; // Default background color
    ctx.fillRect(0, 0, mapWidth, mapHeight);
    
    // Draw placed items
    placedItems.forEach(item => {
        drawItem(item);
        if (item === selectedItem) {
            drawSelectionIndicator(item);
        }
    });
}

function drawItem(item) {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.rotation);
    ctx.scale(item.reversed ? -1 : 1, 1);

    // Draw clickable area
    const buffer = 5;
    const fullWidth = item.width + 2 * buffer;
    const fullHeight = item.height + 2 * buffer;
    ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.fillRect(-fullWidth / 2, -fullHeight / 2, fullWidth, fullHeight);

    // Draw the item image
    ctx.drawImage(item.image, -item.width / 2, -item.height / 2, item.width, item.height);

    ctx.restore();
}

function drawSelectionIndicator(item) {
    const buffer = 5;
    const fullWidth = item.width + 2 * buffer;
    const fullHeight = item.height + 2 * buffer;
    ctx.save();
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.translate(item.x, item.y);
    ctx.rotate(item.rotation);
    ctx.strokeRect(-fullWidth / 2, -fullHeight / 2, fullWidth, fullHeight);
    ctx.restore();
}

// Load categories and items
function loadItems() {
    let accordionId = 1;
    for (const [category, items] of Object.entries(itemsStructure)) {
        const accordionItem = document.createElement('div');
        accordionItem.className = 'accordion-item';
        accordionItem.innerHTML = `
            <h2 class="accordion-header" id="heading${accordionId}">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${accordionId}" aria-expanded="false" aria-controls="collapse${accordionId}">
                    ${category}
                </button>
            </h2>
            <div id="collapse${accordionId}" class="accordion-collapse collapse" aria-labelledby="heading${accordionId}" data-bs-parent="#options">
                <div class="accordion-body">
                    <div class="item-grid"></div>
                </div>
            </div>
        `;
        optionsContainer.appendChild(accordionItem);

        const itemGrid = accordionItem.querySelector('.item-grid');
        for (const item of items) {
            const itemImg = document.createElement('img');
            itemImg.src = `items/${category}/${item}`;
            itemImg.alt = item;
            itemImg.draggable = true;
            itemImg.addEventListener('click', () => addItemToMap(itemImg));
            itemImg.addEventListener('dragstart', dragStart);
            itemGrid.appendChild(itemImg);
        }
        accordionId++;
    }
}

function addItemToMap(itemImg, x = mapWidth / 2, y = mapHeight / 2) {
    const maxDimension = Math.min(mapWidth, mapHeight) * 0.15; // 15% of the smaller map dimension
    const scale = Math.min(maxDimension / itemImg.naturalWidth, maxDimension / itemImg.naturalHeight);
    
    const actionButtonsWidth = document.querySelector('.action-buttons-vertical').offsetWidth;
    
    const newItem = {
        image: new Image(),
        x: x + actionButtonsWidth, // Add the offset here
        y: y,
        width: itemImg.naturalWidth * scale,
        height: itemImg.naturalHeight * scale,
        rotation: 0,
        reversed: false,
        locked: false,
    };
    newItem.image.src = itemImg.src;
    newItem.image.alt = itemImg.alt;
    newItem.image.onload = () => {
        placedItems.push(newItem);
        drawMap();
        updateItemsTable();
    };
}

function dragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.src);
}

// Constants
const ACTIONS = {
    MOVE: 'move',
    ROTATE: 'rotate',
    RESIZE: 'resize',
    REVERSE: 'reverse',
    PUT_IN_FIRST: 'putInFirst'
};

// State
let placedItems = [];
let selectedItem = null;
let currentAction = null; // Remove default MOVE action
let isMoving = false;
let dragStartX, dragStartY;
let initialMouseX, initialMouseY;

// DOM Elements
const moveButton = document.getElementById('moveButton');
const rotateButton = document.getElementById('rotateButton');
const resizeButton = document.getElementById('resizeButton');

// New DOM Elements
const sliderControls = document.getElementById('sliderControls');
const rotateSlider = document.getElementById('rotateSlider');
const resizeSlider = document.getElementById('resizeSlider');
const rotateRange = document.getElementById('rotateRange');
const rotateInput = document.getElementById('rotateInput');
const resizeRange = document.getElementById('resizeRange');
const resizeInput = document.getElementById('resizeInput');

// Add this new state variable
let itemsTable;

// Initialization
function init() {
    resizeMap();
    loadItems();
    initEventListeners();
    initActionButtons();
    initItemsTable();
    initTopbarMenus();
}

function initTopbarMenus() {
    // Handle "About" menu item
    $('#helpDropdown').parent().find('.dropdown-item[data-bs-toggle="modal"]').on('click', function(e) {
        e.preventDefault();
        $($(this).data('bs-target')).modal('show');
    });

    // Handle generate background action
    $('#generateBackground').on('click', generateBackground);

    // Add this new handler for the Export option
    $('#exportImage').on('click', exportCanvasAsImage);

    // Handle other menu items (placeholder functionality)
    $('.dropdown-item').not('[data-bs-toggle="modal"]').not('#generateBackground').not('#exportImage').on('click', function(e) {
        e.preventDefault();
        console.log($(this).text() + ' clicked');
    });
}

// Add this new function to initialize the items table
function initItemsTable() {
    itemsTable = document.getElementById('itemsTable');
    updateItemsTable();
}

// Add this new function to update the items table
function updateItemsTable() {
    const backgroundTiles = placedItems.filter(item => item.locked && (item.image.src.includes('tile1.png') || item.image.src.includes('tile2.png')));
    const otherItems = placedItems.filter(item => !backgroundTiles.includes(item));

    itemsTable.innerHTML = `
        <thead>
            <tr>
                <th>Item</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Background Tiles (${backgroundTiles.length})</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="clearBackground()">Clear Background</button>
                </td>
            </tr>
            ${otherItems.map((item, index) => `
                <tr>
                    <td>${item.image.alt || `Item ${index + 1}`}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="toggleLock(${placedItems.indexOf(item)})">
                            ${item.locked ? 'Unlock' : 'Lock'}
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="removeItem(${placedItems.indexOf(item)})">Remove</button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="reverseItem(${placedItems.indexOf(item)})">Reverse</button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="putItemFirst(${placedItems.indexOf(item)})">Put in First</button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="putItemLast(${placedItems.indexOf(item)})">Put in Last</button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
}

function initEventListeners() {
    window.addEventListener('resize', resizeMap);
    mapCanvas.addEventListener('dragover', dragOver);
    mapCanvas.addEventListener('drop', drop);
    mapCanvas.addEventListener('mousedown', handleMouseDown);
    mapCanvas.addEventListener('mousemove', handleMouseMove);
    mapCanvas.addEventListener('mouseup', handleMouseUp);
    // mapCanvas.addEventListener('dblclick', confirmItemPosition);
}

function initActionButtons() {
    moveButton.addEventListener('click', () => setAction(ACTIONS.MOVE));
    rotateButton.addEventListener('click', () => setAction(ACTIONS.ROTATE));
    resizeButton.addEventListener('click', () => setAction(ACTIONS.RESIZE));
    
    // Add event listeners for sliders
    rotateRange.addEventListener('input', handleRotateSlider);
    rotateInput.addEventListener('change', handleRotateInput);
    resizeRange.addEventListener('input', handleResizeSlider);
    resizeInput.addEventListener('change', handleResizeInput);
    
    updateActionButtons();
}

// Action Handling
function setAction(action) {
    currentAction = action;
    updateActionButtons();
    updateSliderControls();
}

function updateActionButtons() {
    const buttons = [moveButton, rotateButton, resizeButton];
    buttons.forEach(button => {
        const actionName = button.id.replace('Button', '');
        if (selectedItem) {
            button.disabled = false;
            button.classList.toggle('active', actionName === currentAction);
        } else {
            button.disabled = true;
            button.classList.remove('active');
        }
    });
}

function updateSliderControls() {
    if (selectedItem && (currentAction === ACTIONS.ROTATE || currentAction === ACTIONS.RESIZE)) {
        sliderControls.style.display = 'block';
        rotateSlider.style.display = currentAction === ACTIONS.ROTATE ? 'block' : 'none';
        resizeSlider.style.display = currentAction === ACTIONS.RESIZE ? 'block' : 'none';
        
        if (currentAction === ACTIONS.ROTATE) {
            rotateRange.value = rotateInput.value = Math.round(selectedItem.rotation * (180 / Math.PI));
        } else if (currentAction === ACTIONS.RESIZE) {
            resizeRange.value = resizeInput.value = Math.round((selectedItem.width / selectedItem.image.naturalWidth) * 100);
        }
    } else {
        sliderControls.style.display = 'none';
    }
}

function handleRotateSlider() {
    if (selectedItem) {
        const degrees = parseInt(rotateRange.value);
        rotateInput.value = degrees;
        selectedItem.rotation = degrees * (Math.PI / 180);
        drawMap();
    }
}

function handleRotateInput() {
    if (selectedItem) {
        let degrees = parseInt(rotateInput.value);
        degrees = Math.min(Math.max(degrees, 0), 360);
        rotateRange.value = rotateInput.value = degrees;
        selectedItem.rotation = degrees * (Math.PI / 180);
        drawMap();
    }
}

function handleResizeSlider() {
    if (selectedItem) {
        const scale = parseInt(resizeRange.value) / 100;
        resizeInput.value = resizeRange.value;
        resizeSelectedItem(scale);
    }
}

function handleResizeInput() {
    if (selectedItem) {
        let scale = parseInt(resizeInput.value);
        scale = Math.min(Math.max(scale, 10), 200);
        resizeRange.value = resizeInput.value = scale;
        resizeSelectedItem(scale / 100);
    }
}

function resizeSelectedItem(scale) {
    selectedItem.width = selectedItem.image.naturalWidth * scale;
    selectedItem.height = selectedItem.image.naturalHeight * scale;
    drawMap();
}

// Item Selection and Manipulation
function handleMouseDown(e) {
    const { x, y } = getCanvasCoordinates(e);
    console.log('Mouse down at:', x, y);
    
    // Draw a small circle where the click occurred
    ctx.save();
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
    
    // Reverse the array to check from top to bottom
    const clickedItem = [...placedItems].reverse().find(item => {
        const isClicked = isPointInItem(x, y, item);
        console.log('Checking item:', item, 'Clicked:', isClicked);
        return !item.locked && isClicked;
    });
    
    if (clickedItem) {
        console.log('Selected item:', clickedItem);
        selectedItem = clickedItem;
        initialMouseX = x;
        initialMouseY = y;
        initialItemX = clickedItem.x;
        initialItemY = clickedItem.y;
        isMoving = true;
        currentAction = currentAction || ACTIONS.MOVE;
    } else {
        console.log('No item selected');
        selectedItem = null;
        isMoving = false;
        currentAction = null;
    }
    
    updateActionButtons();
    updateSliderControls();
    drawMap();
}

function handleMouseMove(e) {
    const { x, y } = getCanvasCoordinates(e);
    
    // Check if the mouse is over any item
    const hoveredItem = placedItems.find(item => !item.locked && isPointInItem(x, y, item));
    
    // Change cursor style based on whether an item is hovered
    mapCanvas.style.cursor = hoveredItem ? 'pointer' : 'default';

    if (!selectedItem || !currentAction || !isMoving) return;
    
    switch (currentAction) {
        case ACTIONS.MOVE:
            moveItem(selectedItem, x, y);
            break;
        case ACTIONS.ROTATE:
            rotateItem(selectedItem, x, y);
            break;
        case ACTIONS.RESIZE:
            resizeItem(selectedItem, x, y);
            break;
    }
    
    drawMap();
}

function handleMouseUp(e) {
    isMoving = false;
}

function stopCurrentAction() {
    isMoving = false;
    selectedItem = null;
    currentAction = null;
    updateActionButtons();
    updateSliderControls();
    drawMap();
}

function moveItem(item, mouseX, mouseY) {
    const canvasRect = mapCanvas.getBoundingClientRect();
    const scaleX = mapCanvas.width / canvasRect.width;
    const scaleY = mapCanvas.height / canvasRect.height;

    const dx = (mouseX - initialMouseX) * scaleX;
    const dy = (mouseY - initialMouseY) * scaleY;

    item.x = initialItemX + dx;
    item.y = initialItemY + dy;

    console.log('Mouse move:', mouseX, mouseY);
    console.log('Initial mouse:', initialMouseX, initialMouseY);
    console.log('Delta:', dx, dy);
    console.log('New item position:', item.x, item.y);
}

function rotateItem(item, x, y) {
    const dx = x - item.x;
    const dy = y - item.y;
    item.rotation = Math.atan2(dy, dx);
}

function resizeItem(item, x, y) {
    const dx = x - item.x;
    const dy = y - item.y;
    const distance = Math.hypot(dx, dy);
    const originalSize = Math.max(item.image.naturalWidth, item.image.naturalHeight);
    const scale = distance / (originalSize * 0.5); // Adjust this value to change resize sensitivity
    
    // Limit the scale to a reasonable range (e.g., 0.1 to 2 times the original size)
    const minScale = 0.1;
    const maxScale = 2;
    const clampedScale = Math.min(Math.max(scale, minScale), maxScale);
    
    item.width = item.image.naturalWidth * clampedScale;
    item.height = item.image.naturalHeight * clampedScale;
}

function reverseItem(index) {
    if (placedItems[index]) {
        placedItems[index].reversed = !placedItems[index].reversed;
        updateItemsTable();
        drawMap();
    }
}

function putItemFirst(index) {
    const item = placedItems[index];
    placedItems.splice(index, 1);
    placedItems.unshift(item);
    updateItemsTable();
    drawMap();
}

// Add these new functions for item actions
function toggleLock(index) {
    placedItems[index].locked = !placedItems[index].locked;
    updateItemsTable();
    drawMap();
}

function removeItem(index) {
    placedItems.splice(index, 1);
    updateItemsTable();
    drawMap();
}

function putItemLast(index) {
    const item = placedItems[index];
    placedItems.splice(index, 1);
    placedItems.push(item);
    updateItemsTable();
    drawMap();
}

// Utility Functions
function getCanvasCoordinates(e) {
    const rect = mapCanvas.getBoundingClientRect();
    const scaleX = mapCanvas.width / rect.width;
    const scaleY = mapCanvas.height / rect.height;
    const actionButtonsWidth = document.querySelector('.action-buttons-vertical').offsetWidth;
    return {
        x: (e.clientX - rect.left - actionButtonsWidth) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function isPointInItem(x, y, item) {
    const buffer = 2; // Reduced buffer size
    
    // Translate point to item's center
    const dx = x - item.x;
    const dy = y - item.y;
    
    // Rotate point
    const rotatedX = dx * Math.cos(-item.rotation) - dy * Math.sin(-item.rotation);
    const rotatedY = dx * Math.sin(-item.rotation) + dy * Math.cos(-item.rotation);
    
    // Check if the point is inside the rectangle
    const fullWidth = item.width + 2 * buffer;
    const fullHeight = item.height + 2 * buffer;
    
    const isInside = Math.abs(rotatedX) <= fullWidth / 2 && Math.abs(rotatedY) <= fullHeight / 2;

    console.log('Checking item:', item);
    console.log('Mouse position:', x, y);
    console.log('Item position:', item.x, item.y);
    console.log('Rotated position:', rotatedX, rotatedY);
    console.log('Item dimensions (with buffer):', fullWidth, fullHeight);
    console.log('Is inside:', isInside);
    console.log('X check:', Math.abs(rotatedX), '<=', fullWidth / 2);
    console.log('Y check:', Math.abs(rotatedY), '<=', fullHeight / 2);

    return isInside;
}

function dragOver(e) {
    e.preventDefault();
}

function drop(e) {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    const { x, y } = getCanvasCoordinates(e);
    const img = new Image();
    img.src = data;
    img.onload = () => {
        addItemToMap(img, x, y);
    };
}

// Add this new function to generate the background
function generateBackground() {
    const tile1 = new Image();
    const tile2 = new Image();
    tile1.src = 'items/background/tile1.png'; // Replace with actual path to your first tile image
    tile2.src = 'items/background/tile2.png'; // Replace with actual path to your second tile image

    Promise.all([
        new Promise(resolve => tile1.onload = resolve),
        new Promise(resolve => tile2.onload = resolve)
    ]).then(() => {
        const tileWidth = 64; // Adjust this value based on your tile size
        const tileHeight = 64; // Adjust this value based on your tile size

        for (let y = 0; y < mapHeight; y += tileHeight) {
            for (let x = 0; x < mapWidth; x += tileWidth) {
                const tile = Math.random() < 0.5 ? tile1 : tile2;
                const newItem = {
                    image: tile,
                    x: x + tileWidth / 2,
                    y: y + tileHeight / 2,
                    width: tileWidth,
                    height: tileHeight,
                    rotation: 0,
                    reversed: false,
                    locked: true,
                };
                placedItems.push(newItem);
            }
        }

        drawMap();
        updateItemsTable();
    });
}

// Add this new function to clear the background
function clearBackground() {
    placedItems = placedItems.filter(item => !(item.locked && (item.image.src.includes('tile1.png') || item.image.src.includes('tile2.png'))));
    drawMap();
    updateItemsTable();
}

// Add this new function to export the canvas as an image
function exportCanvasAsImage() {
    // Create a temporary canvas to draw the map and items
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = mapWidth;
    tempCanvas.height = mapHeight;
    const tempCtx = tempCanvas.getContext('2d');

    // Draw the map background
    tempCtx.fillStyle = '#8fbc8f';
    tempCtx.fillRect(0, 0, mapWidth, mapHeight);

    // Draw all placed items
    for (const item of placedItems) {
        tempCtx.save();
        tempCtx.translate(item.x, item.y);
        tempCtx.rotate(item.rotation);
        tempCtx.scale(item.reversed ? -1 : 1, 1);
        tempCtx.drawImage(item.image, -item.width / 2, -item.height / 2, item.width, item.height);
        tempCtx.restore();
    }

    try {
        // Convert the canvas to a data URL
        const dataURL = tempCanvas.toDataURL('image/png');

        // Create a temporary link element and trigger the download
        const downloadLink = document.createElement('a');
        downloadLink.href = dataURL;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        downloadLink.download = `wild_forest_map_${timestamp}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    } catch (error) {
        console.error('Failed to export image:', error);
        alert('Failed to export image. This might be due to running the app from local files. Please try using a local server.');
    }
}

// Initialize the application
init();