# Overview

An online image editing tool, featuring prompt-based UI, used together with mouse and keyboard input. The idea is to reduce or remove the friction of looking for tools that are hidden deeply in the UI, e.g. under nested tabs.

## Anonymouse user

No need to log in. All users are anonymouse users.

## Image editing project

Each user can create a new image editing project, whose progress can be saved to a local file. It can be reproduced on UI each time the project file is opened by user. No need to store the undo/redo stack.

We might need to use the experimental `window.showDirectoryPicker()` function for user to grant the UI permissions to access the directory and read and write access to all files under it, which also means all image files have to be located under that directory, which should be warned to the user.

For a new project, an empty canvas with a default width and height is initialized.

It should support multiple layers of images and all layers have alpha channels (transparency support).

The UI is consisted of 3 columns:

1. The main view in the center which is the result of layers of images.
1. A list on the right column of layers that result in the main view.
1. A chat window on the left column to take text input, and show chat and operation history.

The chat window starts with global shortcuts and how to use the tool. E.g.:

1. `Ctrl + Z` to undo.
1. `Ctrl + Shift + Z` to redo.
1. `ESC` to exit any currently using tool by switching to the default, and clear selected area if any.
1. Hold `Shift` for multi-selecting layers.
1. Type any key to start chat.

The chat window updates and confirms each operation performed by the user using the tool, as a result of clicking or dragging.

When asked, the chat can always re-list available shortcuts and howtos.

## Chat window operations

When user's cursor enters the chat window column, other operations related to clicks and drags are irrelevant.

Holding down mouse left button and move to select texts.

All typings without holding `Ctrl` type into the chat input box.

`Ctrl + C` to copy selected texts and `Ctrl + V` to paste into the chat input box.

`Enter` to send the prompt.

## Image editing operations

When user's cursor enters the main view column, other operations related to clicks and drags are irrelevant.

Except `Move`, all other tools require user to request. If unclear, list options and ask user to pick one.

Some tools do not require cursor, while other tools require cursor movement, including clicks and drags, in which case the cursor is changed when such tool is requested. The chat logs the requested tool.

Some tools apply its changes with each cursor movement. Some tools require explicit confirmation.

If a tool requires parameters to be specified to apply the changes, asks user to specify those parameters and provide sensible default. The chat logs the application.

Tools like drawing will not exit after each application. Tools like "Inverse selection" exit after one-time applications.

The result of some tools is stored as input for the following tools, such as a selected area, or selected drawing color.

### Upload image

Can be done in two ways:

1. Chat request: User tells the chat they want to upload an image, which opens the file selection window.
2. Drag and drop: User drags an image file from their system and drops it into the main view.

Supported file types: JPG, JPEG, PNG, BMP, TIFF, WEBP.

No parameters needed.

Applied when a file is uploaded. A new layer is created on top of the stack of layers with the uploaded image placed in the center of the canvas without modifying its original dimensions.

### Move

This is the default tool, when user holds down mouse left button and drag around.

`ESC` will exit any tools selected, switch to `Move` which is the default tool. Clear any selected area.

Apply when a drag ends and it moves the images of the current layers.

### Crop

Requires cursor to hold and drag an area.

Parameters:

1. canvas or layer.

Apply by user confirmation. Canvas or the selected layer(s) are cropped.

### Resize

No cursor involvement.

Parameters:

1. The new width and height.
1. Whether aspect ratio is preserved.
1. Canvas or layer

Apply by user confirmation. Canvas or the selected layer(s) are resized.

### Area selection

There are various tools to perform area selection. Each results in an area selected and stored as the input for following tools, until the selection is cleared.

Area selection mode is defined as below:

1. Replace the current selection. Any new selection replaces the existing one completely.
1. Add to the current selection The new selection is added (union) to the existing selection.
1. Subtract from the current selection. The new selection area is removed (difference) from the existing selection.
1. Intersect with the current selection. Only the overlapping region between the new and existing selections is kept.

#### Rectangle selection

Optionally use cursor to hold and drag a rectangle area. User can revise the area by dragging the edge or the corner before completion. By holding `Shift` key, dragging will make it a square.

Parameters:

1. Area selection mode
1. X (optional)
1. Y (optional)
1. Width (optional)
1. Height (optional)

The rectangle shape is either defined by the cursor movement or by user input.

Apply by user confirmation. Merged the selected area according to the mode.

#### Ellipse selection

Optionally use cursor to hold and drag an ellipse area. User can revise the area by dragging the edge or the corner before completion. By holding `Shift` key, dragging will make it a round circle. By holding `Ctrl` key, dragging will rotate the shape.

Parameters:

1. Area selection mode
1. Rotation degrees (optional)
1. X (optional)
1. Y (optional)
1. Width (optional)
1. Height (optional)

Apply by user confirmation. Merged the selected area according to the mode.

#### Lasso/Free selection

Require cursor to click multiple points, which are connected to form a polygonal area. The area is closed by clicking near the starting point or double-clicking.

Parameters:

1. Area selection mode
1. Whether to use antialiasing

Apply by user confirmation. Close the loop if not closed. Merged the selected area according to the mode.

#### Fuzzy selection

Require cursor to click a point. The contiguous area of similar color starting from that point is formed.

Parameters:

1. Area selection mode
1. Whether to use antialiasing
1. Whether to use "sample merged" (uses all visible layers)
1. Color similarity threshold (optional with default)

Apply by user confirmation. Merged the selected area according to the mode.

#### Scissors selection

Require cursor to click points along object edges. The tool automatically finds and snaps to edges between clicked points using edge detection.

Parameters:

1. Area selection mode
1. Edge detection sensitivity (optional with default)

Apply by user confirmation. Close the loop if not closed. Merged the selected area according to the mode.

### Inverse selection

No cursor involvement.

No parameters needed.

Apply immediately when requested. Only if there is an area selected, the area selected is inversed. If no area selected, report failure.

### Feather selection

No cursor involvement.

Parameters:

1. Radius (in pixels)

Apply by user confirmation. Only if there is an area selected, the edge of selected area is feathered. If no area selected, report failure.

### Grow selection

No cursor involvement.

Parameters:

1. Pixels to grow

Apply by user confirmation. Only if there is an area selected, the edge of selected area is grown by the pixels. If no area selected, report failure.

### Shrink selection

No cursor involvement.

Parameters:

1. Pixels to shrink

Apply by user confirmation. Only if there is an area selected, the edge of selected area is shrunk by the pixels. If no area selected, report failure.

### Brush/Pen tool

Requires cursor to click and drag to draw strokes. The cursor changes to show brush size preview. Hold `Shift` to draw straight lines between click points

Parameters to adjust the brush:

1. Brush size (in pixels, 1-100)
2. Brush hardness (0-100%, where 0% is soft, 100% is hard edge)
3. Opacity (0-100%)
4. Color (foreground color)

Apply by each continuous stroke which is treated as one operation. It's applied to the current layer.

### Eraser tool

Requires cursor to click and drag to erase portions of the layer.

Parameters to adjust the eraser:

1. Eraser size (in pixels, 1-100)
2. Eraser hardness (0-100%)
3. Opacity (0-100%)

Apply by each continuous erasing which is treated as one operation, and areas are erased from the selected layer (sets alpha to transparent).

### Color picker

Optionally use a cursor to pick a color through a dialog which is opened when the color picker tool is requested.

Parameters:

1. Color (RGB, hex, or color name, optionally if not picked in the dialog)

Apply by cursor clicked or color input. The color is persisted as the current drawing color for subsequent brush/pen operations.

### Eyedropper tool

Requires cursor to click on a point in the main view to sample the color at that location. The cursor changes to an eyedropper icon when this tool is active.

Parameters:

1. Sample from (current layer only, or all visible layers merged)

Apply by cursor clicked. The color at the clicked location is sampled and persisted as the current drawing color for subsequent brush/pen operations.

### Path tool

Requires cursor to click multiple points in sequence. Each click creates a point, and straight lines are drawn connecting consecutive points. Double-click or user confirmation to finish the path. Hold `Shift` while clicking to constrain the new point to be perfectly horizontal or vertical relative to the previous point.

Parameters:

1. Line width (in pixels, 1-50)
2. Color (current drawing color)
3. Anti-aliasing (enabled/disabled)

Apply by double-click or user confirmation. Connected line segments are drawn on the selected layer as one operation for undo/redo.

## Layer operations

When user's cursor enters the layer column, all image editing operations related to clicks and drags are irrelevant.

Except `Select/Unselect layer` and `Move layer`, all other tools require user to request. If unclear, ask user to clarify.

### Select/Unselect layer

When user clicks on a layer, a layer is selected and other layers are unselected.

When holding `Shift` key and clicking on a layer, the layer is selected without unselect other layers.

When holding `Shift`, clicking on a selected layer will unselect it, unless it's the last selected layer, in which case nothing happens.

### Move layer

When user holds down mouse left button and drag up and down, the layer(s) is(are) moved accordingly.

### Add layer

Parameters to complete:

1. Name of the layer

Apply by user confirmation. A new layer added to the top of the stack.

### Remove layer

No parameters needed.

Apply by user confirmation. The selected layer(s) is(are) removed.

### Hide layer

No parameters needed.

Apply immediately The selected layer(s) is(are) hidden.

### Show layer

No parameters needed.

Apply immediately The selected layer(s) is(are) shown.

### Lock layer

No parameters needed.

Apply immediately The selected layer(s) is(are) locked. No further image editing can be done on the locked layer. If attempted, telling user it's locked.

### Unlock layer

No parameters needed.

Apply immediately The selected layer(s) is(are) unlocked.

### Duplicate layer

Parameters to complete:

1. Name of the duplicated layer (optional with default)

Apply by user confirmation. The selected layer(s) is(are) duplicated. The duplicated layer(s) is(are) placed directly above the original layer(s) in the stack and automatically selected.

### Merge layers

No parameters needed.

Apply by user confirmation. Only when multiple layers are selected, all selected layers are merged into a single layer. The merged layer retains the name of the topmost selected layer and is positioned at the location of the topmost selected layer in the stack. If only one layer is selected, report failure.

### Alpha to selection

No parameters needed.

Apply immediately Creates a selection based on the alpha channel (transparency) of the selected layer. Fully opaque pixels become fully selected, fully transparent pixels become unselected, and semi-transparent pixels become partially selected.

## Operation stack

Each image editing and layer operation will be pushed to an undo stack. Chat window operations do not apply.

`Ctrl + Z` will pop the latest operation of the undo stack and undo it. The popped operation is pushed to a redo stack.

`Ctrl + Shift + Z` will pop the latest operation of the redo stack, and redo it. The popped operation is pushed to the undo stack.

## Techincal requirements

Deploy on GCP.

Run on a single VM/GCE with container-optimized OS.

Leverage Cloudbuild to deploy.

Database is Google Cloud Datastore.

File storage is Google Cloud Storage.

Programming language is TypeScript.
