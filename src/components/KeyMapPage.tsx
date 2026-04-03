// @documentation-skip
import {
	type CameraFace,
	type CameraRotation,
	getWASDMapping,
} from '../core/faceOrientationKeyMapping';

const faces: CameraFace[] = [
	'front',
	'back',
	'top',
	'bottom',
	'left',
	'right',
];
const rotations: CameraRotation[] = [0, 90, 180, 270];

const KeyDisplay = ({ k, v }: { k: string; v: readonly number[] }) => (
	<div className='key-map-row'>
		<kbd>{k.toUpperCase()}</kbd>
		<span>{`[${v.join(', ')}]`}</span>
	</div>
);

export function KeyMapPage() {
	return (
		<div className='key-map-container'>
			{faces.map(face => (
				<div key={face} className='key-map-face-section'>
					<h2>{face.charAt(0).toUpperCase() + face.slice(1)}</h2>
					<div className='key-map-rotations-grid'>
						{rotations.map(rotation => (
							<div key={rotation} className='key-map-rotation-block'>
								<h3>{rotation}°</h3>
								<div className='key-map-keys'>
									{Object.entries(getWASDMapping(face, rotation)).map(
										([key, value]) => (
											<KeyDisplay key={key} k={key} v={value} />
										),
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
