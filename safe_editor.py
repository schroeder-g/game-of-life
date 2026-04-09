import re

with open('src/contexts/SimulationContext.tsx', 'r') as f:
    text = f.read()

# 1) Imports
text = text.replace(
    "import { processOrganisms } from '../core/organism-processing';",
    "import { DefaultOrganismManager, IOrganismManager } from '../core/OrganismManager';"
)

# 2) State Definition
old_refs = "const organismsRef = useRef<Map<string, Organism>>(new Map()); // Initialize organismsRef"
	const [organismsVersion, setOrganismsVersion] = useState(0); // Initialize organismsVersion
	const initialOrganismsRef = useRef<Map<string, Organism>>(new Map()); // Initialize initialOrganismsRef
	
	// History stacks for organisms (parallel to Grid3D)
	const pastOrganismsRef = useRef<Map<string, Organism>[]>([]);
	const futureOrganismsRef = useRef<Map<string, Organism>[]>([]);"""
new_refs = """const organismManagerRef = useRef<IOrganismManager>(new DefaultOrganismManager());
	const [organismsVersion, setOrganismsVersion] = useState(0);"""
text = text.replace(old_refs, new_refs)

# 3) Initialize defaultConfig
text = text.replace(
    "organismsRef.current.set(orgData.id, deserializeOrganism(orgData, defaultConfig.settings.gridSize));",
    "organismManagerRef.current.organisms.set(orgData.id, deserializeOrganism(orgData, defaultConfig.settings.gridSize));"
)

# 4) EnableOrganisms
old_enable = """useEffect(() => {
		if (!enableOrganisms) {
			if (organismsRef.current.size > 0) {
				organismsRef.current.clear();
				setOrganismsVersion(v => v + 1);
			}
			setSelectedOrganismId(null);
		}
	}, [enableOrganisms]);"""
new_enable = """useEffect(() => {
		if (!enableOrganisms) {
			if (organismManagerRef.current.organisms.size > 0) {
				organismManagerRef.current.clear();
				setOrganismsVersion(organismManagerRef.current.version);
			}
			setSelectedOrganismId(null);
		}
	}, [enableOrganisms]);"""
text = text.replace(old_enable, new_enable)

# 5) grid size change
text = text.replace("organismsRef.current.clear();", "organismManagerRef.current.clear();")

# 6) tickWithOrganismExclusion -> remove it entirely, we replace tick logic
tick_exclusion_re = re.compile(r'/\*\* Remove organism territory.*?birthMargin\]\);', re.DOTALL)
text = tick_exclusion_re.sub('', text)

update_organisms_re = re.compile(r'const updateOrganismsAfterTick = useCallback\(\(skipSnapshot = false.*?birthMargin\]\);', re.DOTALL)
text = update_organisms_re.sub('', text)

record_action_re = re.compile(r'const recordOrganismAction = useCallback\(\(\) => \{.*?\}, \[\]\);', re.DOTALL)
text = record_action_re.sub('// recordAction removed', text)

# step
old_step = """// GoL Phase 1: tick non-organism cells only
			if (organismsRef.current.size > 0) {
				tickWithOrganismExclusion();
			} else {
				gridRef.current.tick(surviveMin, surviveMax, birthMin, birthMax, birthMargin);
			}
			updateOrganismsAfterTick();"""
new_step = """// GoL Phase 1: Delegate organism interception
			if (enableOrganisms) { organismManagerRef.current.beforeTick(gridRef.current); }
			gridRef.current.tick(surviveMin, surviveMax, birthMin, birthMax, birthMargin);
			if (enableOrganisms) { 
				organismManagerRef.current.afterTick(gridRef.current, { surviveMin, surviveMax, birthMin, birthMax, birthMargin, neighborFaces, neighborEdges, neighborCorners, gridSize }); 
				setOrganismsVersion(organismManagerRef.current.version);
			}"""
text = text.replace(old_step, new_step)

# playStop 
text = text.replace("initialOrganismsRef.current = new Map(organismsRef.current);", "organismManagerRef.current.saveInitialState();")

# step backward
old_back = """const success = gridRef.current.stepBackward();
		if (success && pastOrganismsRef.current.length > 0) {
			// Save current to future for "redo" consistency (if ever implemented)
			futureOrganismsRef.current.push(cloneOrganisms(organismsRef.current));
			
			// Restore from past
			organismsRef.current = pastOrganismsRef.current.pop()!;
			setOrganismsVersion(v => v + 1);
		}"""
new_back = """const success = gridRef.current.stepBackward();
		if (success) {
			organismManagerRef.current.stepBackward();
			setOrganismsVersion(organismManagerRef.current.version);
		}"""
text = text.replace(old_back, new_back)

# Context dependencies
text = text.replace("tickWithOrganismExclusion,\n", "")
text = text.replace("updateOrganismsAfterTick,\n", "")

text = text.replace("updateOrganismsAfterTick,\n\t\ttickWithOrganismExclusion,", "enableOrganisms, gridSize,")

# Randomize
old_rand = """initialOrganismsRef.current = new Map(); // Clear initial organisms
		organismsRef.current.clear(); // Clear current organisms
		setOrganismsVersion(v => v + 1); // Trigger re-render"""
new_rand = """organismManagerRef.current.clear();
		organismManagerRef.current.saveInitialState();
		setOrganismsVersion(organismManagerRef.current.version);"""
text = text.replace(old_rand, new_rand)

# Reset
old_reset = """organismsRef.current = new Map(initialOrganismsRef.current); // Restore organisms from initial state
		setOrganismsVersion(v => v + 1);"""
new_reset = """organismManagerRef.current.restoreInitialState();
		setOrganismsVersion(organismManagerRef.current.version);"""
text = text.replace(old_reset, new_reset)

# Clear
old_clear = """initialOrganismsRef.current = new Map(); // Clear initial organisms
		organismsRef.current = new Map(); // Clear current organisms
		setOrganismsVersion(v => v + 1); // Trigger re-render"""
new_clear = """organismManagerRef.current.clear();
		setOrganismsVersion(organismManagerRef.current.version);"""
text = text.replace(old_clear, new_clear)

# apply cells loops
text = text.replace("organismsRef.current = new Map();", "")
text = text.replace("pastOrganismsRef.current = [];", "")
text = text.replace("futureOrganismsRef.current = [];", "")

old_hydration = """if (savedOrgs && Array.isArray(savedOrgs)) {
				for (const orgData of savedOrgs) {
					organismsRef.current.set(
orgData.id,
deserializeOrganism(orgData, finalGridSize),
);
				}
			}
			setOrganismsVersion(v => v + 1);"""
new_hydration = """organismManagerRef.current.applyOrganisms(savedOrgs || [], finalGridSize);
			setOrganismsVersion(organismManagerRef.current.version);"""
text = text.replace(old_hydration, new_hydration)

# convertCommunityToOrganism hooks
text = text.replace("organismsRef.current.values()", "organismManagerRef.current.organisms.values()")
text = text.replace("organismsRef.current.set(newOrganism.id, newOrganism);", "organismManagerRef.current.organisms.set(newOrganism.id, newOrganism);")

# setCommunity loops
text = text.replace("organismsRef.current.entries()", "organismManagerRef.current.organisms.entries()")

# MoveSelected
text = text.replace("organismsRef.current.get(selectedOrganismId)", "organismManagerRef.current.organisms.get(selectedOrganismId)")
text = text.replace("recordOrganismAction();", "organismManagerRef.current.recordAction();")


# Tick function modifications
old_tick = """// GoL Phase 1: tick non-organism cells only
		if (organismsRef.current.size > 0) {
			tickWithOrganismExclusion();
		} else {
			gridRef.current.tick(surviveMin, surviveMax, birthMin, birthMax, birthMargin);
		}

		// After grid tick, process organisms
		updateOrganismsAfterTick();"""
new_tick = """if (enableOrganisms) { organismManagerRef.current.beforeTick(gridRef.current); }
		gridRef.current.tick(surviveMin, surviveMax, birthMin, birthMax, birthMargin);
		if (enableOrganisms) { 
			organismManagerRef.current.afterTick(gridRef.current, { surviveMin, surviveMax, birthMin, birthMax, birthMargin, neighborFaces, neighborEdges, neighborCorners, gridSize }); 
			setOrganismsVersion(organismManagerRef.current.version);
		}"""
text = text.replace(old_tick, new_tick)
text = text.replace("organismsRef.current", "organismManagerRef.current.organisms")

# Render Context mappings
text = text.replace("organisms: organismManagerRef.current.organisms", "organisms: organismManagerRef.current.organisms as any") # Handle multiple replace safely
text = text.replace("organismsRef,", "organismsRef: organismManagerRef as any,")


# Check value definition survived
if "<SimulationContext.Provider value={value}>" not in text and "<SimulationContext.Provider value={value as any}>" not in text:
    print("WARNING: Provider tags are malformed or missing!")

with open('src/contexts/SimulationContext.tsx', 'w') as f:
    f.write(text)

