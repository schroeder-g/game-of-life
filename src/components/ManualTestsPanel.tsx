import { useState, Fragment } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import {
	DocItem,
	ManualTest,
	ManualTestResult,
} from '../types/testing';
import { useManualTests } from '../hooks/useManualTests';
import {
	CheckCircle,
	XCircle,
	Circle,
	ChevronDown,
	ChevronRight,
} from 'lucide-react';
import { ClaimHint } from './ClaimHint';

const StatusIcon = ({
	status,
}: {
	status: ManualTestResult['status'];
}) => {
	const iconProps = { size: 18, style: { flexShrink: 0 } };
	if (status === 'checked')
		return <CheckCircle color='#4caf50' {...iconProps} />;
	if (status === 'failed')
		return <XCircle color='#f44336' {...iconProps} />;
	return <Circle color='#888' {...iconProps} />;
};

interface ManualTestsPanelProps {
	manualTests: ManualTest[];
	automatedTestIds: Set<string>;
}

export function ManualTestsPanel({
	manualTests,
	automatedTestIds,
}: ManualTestsPanelProps) {
	const { testStatuses, cycleTestStatus } = useManualTests();
	const [isCollapsed, setIsCollapsed] = usePersistentState(
		'gol_collapse_manual_tests',
		true,
	);
	const [expandedTests, setExpandedTests] = useState<Set<string>>(
		new Set(),
	);

	const toggleExpandedTest = (testId: string) => {
		setExpandedTests(prev => {
			const newSet = new Set(prev);
			if (newSet.has(testId)) newSet.delete(testId);
			else newSet.add(testId);
			return newSet;
		});
	};

	return (
		<section className='menu-section'>
			<div>
				<h3
					onClick={() => setIsCollapsed(!isCollapsed)}
					style={{
						cursor: 'pointer',
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
					}}
				>
					Manual Tests
					<span style={{ fontSize: '12px', opacity: 0.6 }}>
						{isCollapsed ? '▼' : '▲'}
					</span>
				</h3>
				{!isCollapsed && (
					<div
						style={{
							maxHeight: 'calc(100vh - 300px)',
							overflowY: 'auto',
							paddingRight: '8px',
							marginTop: '12px',
						}}
					>
						{manualTests.map(test => {
							const isExpanded = expandedTests.has(test.id);
							return (
								<div key={test.id} style={{ marginBottom: '12px' }}>
									<div
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: '8px',
											cursor: 'pointer',
										}}
									>
										<div onClick={() => cycleTestStatus(test.id)}>
											<StatusIcon
												status={testStatuses.get(test.id)?.status}
											/>
										</div>
										<span
											onClick={() => toggleExpandedTest(test.id)}
											style={{
												flex: 1,
												fontWeight: automatedTestIds.has(test.id)
													? 'bold'
													: 'normal',
												userSelect: 'none',
											}}
										>
											{test.title}
										</span>
										<div
											onClick={() => toggleExpandedTest(test.id)}
											style={{ color: '#aaa' }}
										>
											{isExpanded ? (
												<ChevronDown size={16} />
											) : (
												<ChevronRight size={16} />
											)}
										</div>
									</div>
									{isExpanded && (
										<div
											style={{
												paddingLeft: '26px',
												marginTop: '8px',
												fontSize: '13px',
												color: '#ccc',
											}}
										>
											<div
												style={{
													marginBottom: '8px',
													fontStyle: 'italic',
													fontSize: '12px',
												}}
											>
												Verifies claims:{' '}
												{test.claimIds.map(id => (
													<Fragment key={id}>
														<ClaimHint claimId={id} />
													</Fragment>
												))}
											</div>
											<ul style={{ margin: 0, paddingLeft: '20px' }}>
												{test.steps.map((step, i) => (
													<li
														key={i}
														dangerouslySetInnerHTML={{ __html: step }}
													/>
												))}
											</ul>
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</section>
	);
}
