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

    // Draw selection rectangle if multi-selecting
    if (isMultiSelecting && selectionRect) {
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
            selectionRect.startX ,
            selectionRect.startY,
            selectionRect.endX - selectionRect.startX,
            selectionRect.endY - selectionRect.startY
        );
        ctx.setLineDash([]);
    }

    // Draw selection indicators for all selected items
    selectedItems.forEach(item => {
        drawSelectionIndicator(item);
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
        x: x + actionButtonsWidth,
        y: y,
        width: itemImg.naturalWidth * scale, // Remove lastScale
        height: itemImg.naturalHeight * scale, // Remove lastScale
        rotation: 0, // Set to 0 instead of lastRotation
        reversed: false,
        locked: false,
    };
    newItem.image.src = itemImg.src;
    newItem.image.alt = itemImg.alt;
    newItem.image.onload = () => {
        // Find the index where background tiles end
        const backgroundEndIndex = placedItems.findIndex(item => !item.locked || !(item.image.src.includes('tile1.png') || item.image.src.includes('tile2.png')));
        
        if (backgroundEndIndex === -1) {
            // If no background tiles, or all items are background, add to the end
            placedItems.push(newItem);
        } else {
            // Insert the new item after the background tiles
            placedItems.splice(backgroundEndIndex, 0, newItem);
        }
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

// Add these new state variables
let selectedItems = [];
let isMultiSelecting = false;
let selectionRect = null;

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

// Add these new variables to store the last used settings
let lastRotation = 0;
let lastScale = 1;

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

    // Add these new handlers for Export JSON and Import JSON
    $('#exportJSON').on('click', exportMapAsJSON);
    $('#importJSON').on('click', () => $('#importJSONModal').modal('show'));
    $('#importJSONButton').on('click', importMapFromJSON);

    // Handle other menu items (placeholder functionality)
    $('.dropdown-item').not('[data-bs-toggle="modal"]').not('#generateBackground').not('#exportImage').not('#exportJSON').not('#importJSON').on('click', function(e) {
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

    // Move the selected items to the top of the list
    selectedItems.forEach(selectedItem => {
        const index = otherItems.indexOf(selectedItem);
        if (index > -1) {
            otherItems.splice(index, 1);
            otherItems.unshift(selectedItem);
        }
    });

    itemsTable.innerHTML = `
        <thead>
            <tr>
                <th>Key</th>
                <th>Item</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>-</td>
                <td>Background Tiles (${backgroundTiles.length})</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="clearBackground()">Clear Background</button>
                </td>
            </tr>
            ${otherItems.map((item, index) => `
                <tr class="${selectedItems.includes(item) ? 'table-primary' : ''}" onclick="toggleItemSelection(${placedItems.indexOf(item)})">
                    <td>${placedItems.indexOf(item)}</td>
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

// Add this new function to select an item from the table
function selectItemFromTable(index) {
    selectedItem = placedItems[index];
    currentAction = ACTIONS.MOVE;
    
    // Apply last used rotation and scale
    selectedItem.rotation = lastRotation;
    const originalWidth = selectedItem.image.naturalWidth;
    const originalHeight = selectedItem.image.naturalHeight;
    selectedItem.width = originalWidth * lastScale;
    selectedItem.height = originalHeight * lastScale;
    
    updateActionButtons();
    updateSliderControls();
    drawMap();
    updateItemsTable();
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
        if (selectedItems.length > 0) {
            button.disabled = false;
            button.classList.toggle('active', actionName === currentAction);
        } else {
            button.disabled = true;
            button.classList.remove('active');
        }
    });
}

function updateSliderControls() {
    if (selectedItems.length > 0 && (currentAction === ACTIONS.ROTATE || currentAction === ACTIONS.RESIZE)) {
        sliderControls.style.display = 'block';
        rotateSlider.style.display = currentAction === ACTIONS.ROTATE ? 'block' : 'none';
        resizeSlider.style.display = currentAction === ACTIONS.RESIZE ? 'block' : 'none';
        
        if (currentAction === ACTIONS.ROTATE) {
            const avgRotation = selectedItems.reduce((sum, item) => sum + item.rotation, 0) / selectedItems.length;
            rotateRange.value = rotateInput.value = Math.round(avgRotation * (180 / Math.PI));
        } else if (currentAction === ACTIONS.RESIZE) {
            const avgScale = selectedItems.reduce((sum, item) => sum + (item.width / item.image.naturalWidth), 0) / selectedItems.length;
            resizeRange.value = resizeInput.value = Math.round(avgScale * 100);
        }
    } else {
        sliderControls.style.display = 'none';
    }
}

function handleRotateSlider() {
    if (selectedItems.length > 0) {
        const degrees = parseInt(rotateRange.value);
        rotateInput.value = degrees;
        const rotation = degrees * (Math.PI / 180);
        selectedItems.forEach(item => {
            item.rotation = rotation;
        });
        lastRotation = rotation;
        drawMap();
    }
}

function handleRotateInput() {
    if (selectedItems.length > 0) {
        let degrees = parseInt(rotateInput.value);
        degrees = Math.min(Math.max(degrees, 0), 360);
        rotateRange.value = rotateInput.value = degrees;
        const rotation = degrees * (Math.PI / 180);
        selectedItems.forEach(item => {
            item.rotation = rotation;
        });
        lastRotation = rotation;
        drawMap();
    }
}

function handleResizeSlider() {
    if (selectedItems.length > 0) {
        const scale = parseInt(resizeRange.value) / 100;
        resizeInput.value = resizeRange.value;
        selectedItems.forEach(item => {
            item.width = item.image.naturalWidth * scale;
            item.height = item.image.naturalHeight * scale;
        });
        lastScale = scale;
        drawMap();
    }
}

function handleResizeInput() {
    if (selectedItems.length > 0) {
        let scale = parseInt(resizeInput.value);
        scale = Math.min(Math.max(scale, 10), 200);
        resizeRange.value = resizeInput.value = scale;
        selectedItems.forEach(item => {
            item.width = item.image.naturalWidth * scale / 100;
            item.height = item.image.naturalHeight * scale / 100;
        });
        lastScale = scale / 100;
        drawMap();
    }
}

function handleMouseMove(e) {
    const { x, y } = getCanvasCoordinates(e);
    
    if (isMultiSelecting) {
        selectionRect.endX = x;
        selectionRect.endY = y;
        drawMap();
        return;
    }

    // Check if the mouse is over any item
    const hoveredItem = placedItems.find(item => !item.locked && isPointInItem(x, y, item));
    
    // Change cursor style based on whether an item is hovered
    mapCanvas.style.cursor = hoveredItem ? 'pointer' : 'default';

    if (!isMoving || selectedItems.length === 0) return;
    
    const dx = x - initialMouseX;
    const dy = y - initialMouseY;

    switch (currentAction) {
        case ACTIONS.MOVE:
            selectedItems.forEach(item => {
                item.x += dx;
                item.y += dy;
            });
            initialMouseX = x;
            initialMouseY = y;
            break;
        case ACTIONS.ROTATE:
            rotateItems(x, y);
            break;
        case ACTIONS.RESIZE:
            resizeItems(x, y);
            break;
    }
    
    drawMap();
}

function rotateItems(x, y) {
    if (selectedItems.length === 0) return;
    
    const centerX = selectedItems.reduce((sum, item) => sum + item.x, 0) / selectedItems.length;
    const centerY = selectedItems.reduce((sum, item) => sum + item.y, 0) / selectedItems.length;
    
    const dx = x - centerX;
    const dy = y - centerY;
    const rotation = Math.atan2(dy, dx);
    
    selectedItems.forEach(item => {
        item.rotation = rotation;
    });
}

function resizeItems(x, y) {
    if (selectedItems.length === 0) return;
    
    const centerX = selectedItems.reduce((sum, item) => sum + item.x, 0) / selectedItems.length;
    const centerY = selectedItems.reduce((sum, item) => sum + item.y, 0) / selectedItems.length;
    
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.hypot(dx, dy);
    
    const averageOriginalSize = selectedItems.reduce((sum, item) => 
        sum + Math.max(item.image.naturalWidth, item.image.naturalHeight), 0) / selectedItems.length;
    
    const scale = distance / (averageOriginalSize * 0.5);
    const minScale = 0.1;
    const maxScale = 2;
    const clampedScale = Math.min(Math.max(scale, minScale), maxScale);
    
    selectedItems.forEach(item => {
        item.width = item.image.naturalWidth * clampedScale;
        item.height = item.image.naturalHeight * clampedScale;
    });
}

function handleMouseDown(e) {
    const { x, y } = getCanvasCoordinates(e);
    console.log('Mouse down at:', x, y);
    
    const clickedItem = [...placedItems].reverse().find(item => {
        return !item.locked && isPointInItem(x, y, item);
    });

    if (e.shiftKey) {
        // Shift + Click functionality
        if (clickedItem) {
            const index = selectedItems.indexOf(clickedItem);
            if (index === -1) {
                selectedItems.push(clickedItem);
            } else {
                selectedItems.splice(index, 1);
            }
        } else {
            // Start multi-selection rectangle if no item was clicked
            isMultiSelecting = true;
            selectionRect = { startX: x, startY: y, endX: x, endY: y };
        }
    } else {
        // Regular click functionality
        if (!e.ctrlKey && clickedItem && !selectedItems.includes(clickedItem)) {
            selectedItems = [clickedItem];
        }

        if (clickedItem) {
            selectedItem = clickedItem;
            initialMouseX = x;
            initialMouseY = y;
            isMoving = true;
            currentAction = currentAction || ACTIONS.MOVE;
        } else {
            selectedItems = [];
            selectedItem = null;
            isMoving = false;
            currentAction = null;
        }
    }
    
    updateActionButtons();
    updateSliderControls();
    updateItemsTable();
    drawMap();
}

function handleMouseUp(e) {
    if (isMultiSelecting) {
        finishMultiSelection();
    }
    isMoving = false;
    isMultiSelecting = false;
    selectionRect = null;
    drawMap();
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
    const actionButtonsWidth = document.querySelector('.action-buttons-vertical').offsetWidth - 12;
    return {
        x: (e.clientX - rect.left - actionButtonsWidth) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function isPointInItem(x, y, item) {
    const buffer = 2; // Reduced buffer size
    const actionButtonsWidth = 20;
    
    // Translate point to item's center, accounting for the action buttons width
    const dx = (x + actionButtonsWidth) - item.x;
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
    console.log('Adjusted mouse position:', x + actionButtonsWidth, y);
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
    tile1.src = 'items/background/tile1.png';
    tile2.src = 'items/background/tile2.png';

    Promise.all([
        new Promise(resolve => tile1.onload = resolve),
        new Promise(resolve => tile2.onload = resolve)
    ]).then(() => {
        const tileWidth = 64;
        const tileHeight = 64;
        const backgroundTiles = [];

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
                backgroundTiles.push(newItem);
            }
        }

        // Insert background tiles at the beginning of placedItems
        placedItems.unshift(...backgroundTiles);

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

// Add this new function to finish multi-selection
function finishMultiSelection() {
    const left = Math.min(selectionRect.startX, selectionRect.endX);
    const right = Math.max(selectionRect.startX, selectionRect.endX);
    const top = Math.min(selectionRect.startY, selectionRect.endY);
    const bottom = Math.max(selectionRect.startY, selectionRect.endY);

    selectedItems = placedItems.filter(item => 
        item.x > left && item.x < right && item.y > top && item.y < bottom
    );

    updateItemsTable();
}

// Add this new function to toggle item selection
function toggleItemSelection(index) {
    const item = placedItems[index];
    const selectionIndex = selectedItems.indexOf(item);
    if (selectionIndex === -1) {
        selectedItems.push(item);
    } else {
        selectedItems.splice(selectionIndex, 1);
    }
    updateItemsTable();
    drawMap();
}

// Add this new function to export the map as JSON
function exportMapAsJSON() {
    const mapData = {
        placedItems: placedItems.map(item => ({
            src: item.image.src,
            alt: item.image.alt,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            rotation: item.rotation,
            reversed: item.reversed,
            locked: item.locked
        }))
    };

    const jsonString = JSON.stringify(mapData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadLink.download = `wild_forest_map_${timestamp}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
}

// Add this new function to import the map from JSON
function importMapFromJSON() {
    const jsonInput = document.getElementById('jsonInput');
    const jsonString = jsonInput.value.trim();

    if (!jsonString) {
        alert('Please paste a valid JSON string.');
        return;
    }

    try {
        const mapData = JSON.parse(jsonString);
        placedItems = [];

        const imageLoadPromises = mapData.placedItems.map(item => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const newItem = {
                        image: img,
                        x: item.x,
                        y: item.y,
                        width: item.width,
                        height: item.height,
                        rotation: item.rotation,
                        reversed: item.reversed,
                        locked: item.locked
                    };
                    placedItems.push(newItem);
                    resolve();
                };
                img.onerror = reject;
                img.src = item.src;
                img.alt = item.alt;
            });
        });

        Promise.all(imageLoadPromises)
            .then(() => {
                drawMap();
                updateItemsTable();
                $('#importJSONModal').modal('hide');
                jsonInput.value = '';
            })
            .catch(error => {
                console.error('Error loading images:', error);
                alert('Error loading images. Please check the JSON data and try again.');
            });
    } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Invalid JSON format. Please check the input and try again.');
    }
}

// Initialize the application
init();