// @documentation-skip
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ReleaseNotesModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function ReleaseNotesModal({
	isOpen,
	onClose,
}: ReleaseNotesModalProps) {
	const [content, setContent] = useState<string>('');
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		const handleEscapeKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener('keydown', handleEscapeKey);
			fetch('/releasenotes.md')
				.then(res => res.text())
				.then(text => {
					setContent(text);
					setLoading(false);
				})
				.catch(err => {
					console.error('Failed to fetch release notes:', err);
					setContent('Failed to load release notes.');
					setLoading(false);
				});
		}

		return () => {
			document.removeEventListener('keydown', handleEscapeKey);
		};
	}, [isOpen, onClose]);

	if (!isOpen) {
		return null;
	}

	// Basic markdown to HTML renderer
	const renderMarkdown = (md: string) => {
		return md
			.replace(/^# (.*$)/gim, '<h1>$1</h1>') // H1
			.replace(/^### (.*$)/gim, '<h3>$1</h3>') // H3
			.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>') // Bold
			.replace(/^\- (.*$)/gim, '<li>$1</li>') // List items
			.replace(/^---$/gim, '<hr />') // HR
			.split('\n')
			.map(line => (line.trim() === '' ? '<br/>' : line))
			.join('\n'); // Line breaks
	};

	return createPortal(
		<div className='modal-overlay' onClick={onClose}>
			<div
				className='glass-panel modal-content release-notes-modal'
				onClick={e => e.stopPropagation()}
				style={{
					display: 'flex',
					flexDirection: 'column',
					width: 'clamp(300px, 90vw, 800px)',
					maxHeight: '85vh',
					borderRadius: '8px',
					boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
				}}
			>
				<div className='modal-header'>
					<h2>Release Notes</h2>
					<button className='glass-button' onClick={onClose}>
						&times;
					</button>
				</div>
				<div
					className='doc-content'
					style={{
						overflowY: 'auto',
						flexGrow: 1,
						padding: '0 1.5rem 1.5rem',
					}}
				>
					{loading ? (
						<p>Loading release notes...</p>
					) : (
						<div
							style={{ lineHeight: '1.6' }}
							dangerouslySetInnerHTML={{
								__html: renderMarkdown(content),
							}}
						/>
					)}
				</div>
				<div
					className='modal-actions'
					style={{
						borderTop: '1px solid rgba(255,255,255,0.1)',
						paddingTop: '0.75rem',
						paddingBottom: '0.75rem',
					}}
				>
					<button className='glass-button' onClick={onClose}>
						Close
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
