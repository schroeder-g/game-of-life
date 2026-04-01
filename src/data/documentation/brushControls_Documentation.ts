import { DocItem } from "./_Documentation";

export const brushControlsDocumentation: DocItem[] = [
  {
    id: "BC_DRAG_001",
    type: "h3",
    text: "<b>Brush Controls Panel Draggability</b>",
  },
  {
    id: "BC_DRAG_001_CLAIM",
    type: "p",
    text: `The <span class="code-ref">BrushControls</span> panel (<span class="code-ref">src/components/BrushControls.tsx</span>) is designed to be freely draggable anywhere on the screen. Users can click and drag the panel to reposition it according to their preference. This functionality is implemented using mouse and touch event listeners (<span class="code-ref">handleMouseDown</span>, <span class="code-ref">handleMouseMove</span>, <span class="code-ref">handleMouseUp</span>, <span class="code-ref">handleTouchStart</span>, <span class="code-ref">handleTouchMove</span>, <span class="code-ref">handleTouchEnd</span>) that update the panel's <span class="code-ref">position</span> state.`,
    testIds: ["TEST_BC_DRAG_001"],
  },
  {
    id: "BC_INIT_001",
    type: "h3",
    text: "<b>Brush Controls Panel Initialization</b>",
  },
  {
    id: "BC_INIT_001_CLAIM",
    type: "p",
    text: `Upon initialization, the <span class="code-ref">BrushControls</span> panel (<span class="code-ref">src/components/BrushControls.tsx</span>) automatically centers itself on the screen. This ensures a consistent and user-friendly starting layout, regardless of screen size or previous usage. The initial positioning logic is handled within a <span class="code-ref">useEffect</span> hook that calculates the center coordinates based on <span class="code-ref">window.innerWidth</span> and <span class="code-ref">window.innerHeight</span>.`,
    testIds: ["TEST_BC_INIT_001"],
  },
  {
    id: "BC_APPEAR_001",
    type: "h3",
    text: "<b>Brush Controls Panel Appearance</b>",
  },
  {
    id: "BC_APPEAR_001_CLAIM",
    type: "p",
    text: `The <span class="code-ref">BrushControls</span> panel features a clear "Brush Controls" header, a subtle orange outline, and rounded corners for a modern and integrated look. The header text is styled with <span class="code-ref">color: #FFA500</span> and the panel border with <span class="code-ref">border: 2px solid #FFA50080</span> and <span class="code-ref">borderRadius: '8px'</span> in <span class="code-ref">src/components/BrushControls.tsx</span>.`,
    testIds: ["TEST_BC_APPEAR_001"],
  },
  {
    id: "BC_APPEAR_002",
    type: "h3",
    text: "<b>Brush Controls Panel Width</b>",
  },
  {
    id: "BC_APPEAR_002_CLAIM",
    type: "p",
    text: `The <span class="code-ref">BrushControls</span> panel is designed to be 50% wider than its default size, providing more space for its controls. This is achieved by setting the <span class="code-ref">maxWidth</span> property of its internal grid container to <span class="code-ref">'300px'</span> in <span class="code-ref">src/components/BrushControls.tsx</span>.`,
    testIds: ["TEST_BC_APPEAR_002"],
  },
  {
    id: "BC_VIS_001",
    type: "h3",
    text: "<b>Brush Controls Panel Visibility</b>",
  },
  {
    id: "BC_VIS_001_CLAIM",
    type: "p",
    text: `The <span class="code-ref">BrushControls</span> panel is only visible when the simulation is in edit mode (i.e., when <span class="code-ref">rotationMode</span> is <span class="code-ref">false</span>). This conditional rendering is managed in <span class="code-ref">src/components/AppHeaderPanel.tsx</span>, ensuring the controls do not clutter the interface during camera rotation.`,
    testIds: ["TEST_BC_VIS_001"],
  },
  {
    id: "BC_BUTTON_001",
    type: "h3",
    text: "<b>Brush Controls Directional Buttons</b>",
  },
  {
    id: "BC_BUTTON_001_CLAIM",
    type: "p",
    text: `The directional buttons (Up, Down, Left, Right, Further, Closer) on the <span class="code-ref">BrushControls</span> panel (<span class="code-ref">src/components/BrushControls.tsx</span>) allow precise manipulation of the brush selector. When clicked, these buttons emit a <span class="code-ref">moveSelector</span> event via the <span class="code-ref">eventBus</span> with a <span class="code-ref">delta</span> value determined by the current <span class="code-ref">cameraOrientation</span>, ensuring movement is relative to the user's view.`,
    testIds: ["TEST_BC_BUTTON_001_W", "TEST_BC_BUTTON_001_X", "TEST_BC_BUTTON_001_A", "TEST_BC_BUTTON_001_D", "TEST_BC_BUTTON_001_Q", "TEST_BC_BUTTON_001_Z"],
  },
];
