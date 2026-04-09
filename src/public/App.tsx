import { Canvas } from '@react-three/fiber';
import { useEffect, useState, useRef } from 'react';
import { Scene } from '../components/Grid';
import { SettingsSidebar } from '../components/SettingsSidebar';
import { AppHeaderPanel } from '../components/AppHeaderPanel';
import { AppFooterPanel } from '../components/AppFooterPanel';
import { SelectedCommunityPanel } from '../components/SelectedCommunityPanel';
import { WelcomeModal } from '../components/WelcomeModal';
import { useSimulation } from '../contexts/SimulationContext';
import { useAppShortcuts } from '../hooks/useAppShortcuts';
import { ContextBridge } from '../contexts/ContextBridge';

const TriangleUpIcon = () => (
	<svg
		width='16'
		height='16'
		viewBox='0 0 24 24'
		fill='currentColor' /* Solid filling as requested for "cute" look */
		stroke='currentColor'
		strokeWidth='1'
		strokeLinecap='round'
		strokeLinejoin='round'
	>
		<path d='M12 4l10 16H2L12 4z' />
	</svg>
);

export default function App() {
	const {
		state: {
			viewMode,
			userName,
			showIntroduction,
		},
		actions: { recenter, fitDisplay, setShowIntroduction, setUserName },
	} = useSimulation();

	const buildInfo = window.__BUILD_INFO__;

	const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1024);
	const [showSettingsSidebar, setShowSettingsSidebar] = useState(window.innerWidth >= 1024);
	const [showCommunityPanel, setShowCommunityPanel] = useState(true);
	const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
	const [scrollPosition, setScrollPosition] = useState(0);
	const mainContentRef = useRef<HTMLDivElement>(null);

	useAppShortcuts();

	// Effect to handle mode transitions
	useEffect(() => {
		if (viewMode === false) {
			recenter();
			fitDisplay();
		}
	}, [viewMode, recenter, fitDisplay]);

	// Effect to check screen size for small screens
	useEffect(() => {
		const handleResize = () => {
			setIsSmallScreen(window.innerWidth < 1024);
		};
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	// Scroll listener for small screens to track scroll position for the depth indicator
	useEffect(() => {
		if (!isSmallScreen) {
			setScrollPosition(0);
			return;
		}

		const handleScroll = () => {
			const container = mainContentRef.current;
			if (!container) return;
			setScrollPosition(Math.round(container.scrollTop));
		};

		window.addEventListener('scroll', handleScroll, true);
		return () => window.removeEventListener('scroll', handleScroll, true);
	}, [isSmallScreen]);

	const scrollToTop = () => {
		if (mainContentRef.current) {
			mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
		}
	};

	return (
		<div className="app">
			<AppHeaderPanel 
				isSmallScreen={isSmallScreen}
				showSettingsSidebar={showSettingsSidebar}
				setShowSettingsSidebar={setShowSettingsSidebar}
				showCommunityPanel={showCommunityPanel}
				setShowCommunityPanel={setShowCommunityPanel}
			/>

			{isSmallScreen && scrollPosition >= 75 && (
				<div 
					className="settings-scroll-top"
					onClick={scrollToTop}
					aria-label="Scroll back to top"
				>
					<TriangleUpIcon />
				</div>
			)}
			
			<div
				className="main-content-layout"
				ref={mainContentRef}
				style={{
					flex: 1,
					display: 'flex',
					flexDirection: isSmallScreen ? 'column' : 'row',
					overflowY: isSmallScreen ? 'auto' : 'hidden',
					overflowX: 'hidden',
					position: 'relative',
				}}
			>

				<aside
					className="ui-overlay"
					style={{ 
						display: showSettingsSidebar ? 'flex' : 'none',
						flexDirection: 'column'
					}}
				>
					<SettingsSidebar
						isSmallScreen={isSmallScreen}
						setIsSettingsDropdownOpen={setIsSettingsDropdownOpen}
						setShowSettingsSidebar={setShowSettingsSidebar}
					/>
				</aside>

				<main
					className="canvas-container"
					style={{
						flex: 1,
						height: '100%',
						display:
							isSmallScreen &&
							showSettingsSidebar &&
							isSettingsDropdownOpen
								? 'none'
								: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						overflow: 'hidden',
						position: 'relative'
					}}
				>
					<Canvas
						shadows
						gl={{ antialias: true, alpha: true }}
						camera={{ position: [0, 0, 40], fov: 45 }}
						style={{ width: '100%', height: '100%', touchAction: 'none' }}
					>
						<ContextBridge>
							<Scene />
						</ContextBridge>
					</Canvas>
				</main>
			</div>

			<AppFooterPanel userName={userName} buildInfo={buildInfo} />
			
			{!isSmallScreen && showCommunityPanel && <SelectedCommunityPanel isVisible={true} />}
			
			{showIntroduction &&
				(userName ||
				localStorage.getItem('userName') ||
				buildInfo.distribution === 'prod' ? null : (
					<WelcomeModal
						setShowIntroduction={setShowIntroduction}
						setUserName={setUserName}
					/>
				))}
		</div>
	);
}
