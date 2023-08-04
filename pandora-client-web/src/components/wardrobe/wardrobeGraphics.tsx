import {
	AssetFrameworkCharacterState,
	HexColorString,
	ICharacterRoomData,
	IChatroomBackgroundData,
	ResolveBackground,
} from 'pandora-common';
import React, { ReactElement, useMemo } from 'react';
import { AppearanceContainer } from '../../character/character';
import { shardConnectorContext, useAppearanceActionEvent } from '../gameContext/shardConnectorContextProvider';
import { Button } from '../common/button/button';
import { useEvent } from '../../common/useEvent';
import { GraphicsBackground, GraphicsScene, GraphicsSceneProps } from '../../graphics/graphicsScene';
import { CHARACTER_PIVOT_POSITION, GraphicsCharacter } from '../../graphics/graphicsCharacter';
import { ColorInput } from '../common/colorInput/colorInput';
import { directoryConnectorContext, useCurrentAccountSettings, useDirectoryConnector } from '../gameContext/directoryConnectorContextProvider';
import { useAssetManager } from '../../assets/assetManager';
import { useCharacterIsInChatroom, useChatRoomInfo } from '../gameContext/chatRoomContextProvider';
import { useChatRoomCharacterOffsets, useChatRoomCharacterPosition } from '../chatroom/chatRoomCharacter';
import { usePlayerVisionFilters } from '../chatroom/chatRoomScene';

export function WardrobeCharacterPreview({ character, characterState }: {
	character: AppearanceContainer<ICharacterRoomData>;
	characterState: AssetFrameworkCharacterState;
}): ReactElement {
	const roomInfo = useChatRoomInfo();
	const assetManager = useAssetManager();
	const accountSettings = useCurrentAccountSettings();

	const roomBackground = useMemo((): Readonly<IChatroomBackgroundData> | null => {
		if (roomInfo && accountSettings.wardrobeUseRoomBackground) {
			return ResolveBackground(assetManager, roomInfo.background);
		}
		return null;
	}, [assetManager, roomInfo, accountSettings]);

	const wardrobeBackground: number = Number.parseInt(accountSettings.wardrobeBackground.substring(1, 7), 16);

	const [onClick, processing] = useAppearanceActionEvent({
		type: 'setView',
		target: character.id,
		view: characterState.view === 'front' ? 'back' : 'front',
	});

	const sceneOptions = useMemo<GraphicsSceneProps>(() => ({
		forwardContexts: [directoryConnectorContext, shardConnectorContext],
		backgroundColor: roomBackground ? 0x000000 : wardrobeBackground,
	}), [roomBackground, wardrobeBackground]);

	const overlay = (
		<div className='overlay'>
			<Button className='slim iconButton'
				title='Toggle character view'
				onClick={ onClick }
				disabled={ processing }
			>
				↷
			</Button>
			<WardrobeBackgroundColorPicker />
		</div>
	);

	const { pivot } = useChatRoomCharacterOffsets(characterState);
	const filters = usePlayerVisionFilters(character.isPlayer());

	return (
		<GraphicsScene className='characterPreview' divChildren={ overlay } sceneOptions={ sceneOptions }>
			<GraphicsCharacter
				position={ { x: CHARACTER_PIVOT_POSITION.x, y: CHARACTER_PIVOT_POSITION.y } }
				pivot={ pivot }
				characterState={ characterState }
				filters={ filters }
			/>
			{
				roomBackground ? (
					<WardrobeRoomBackground character={ character } characterState={ characterState } roomBackground={ roomBackground } />
				) : null
			}
		</GraphicsScene>
	);
}

function WardrobeRoomBackground({
	roomBackground,
	character,
	characterState,
}: {
	roomBackground: Readonly<IChatroomBackgroundData>;
	character: AppearanceContainer<ICharacterRoomData>;
	characterState: AssetFrameworkCharacterState;
}): ReactElement {
	const { position, scale, errorCorrectedPivot, yOffset } = useChatRoomCharacterPosition(character.data.position, characterState, roomBackground);
	const filters = usePlayerVisionFilters(false);

	const inverseScale = 1 / scale;

	return (
		<GraphicsBackground
			zIndex={ -1000 }
			background={ roomBackground.image }
			x={ errorCorrectedPivot.x - position.x * inverseScale }
			y={ errorCorrectedPivot.y + yOffset - position.y * inverseScale }
			backgroundSize={ [roomBackground.size[0] * inverseScale, roomBackground.size[1] * inverseScale] }
			backgroundFilters={ filters }
		/>
	);
}

function WardrobeBackgroundColorPicker(): ReactElement | null {
	const accountSettings = useCurrentAccountSettings();
	const directory = useDirectoryConnector();
	const isInRoom = useCharacterIsInChatroom();

	const onChange = useEvent((newColor: HexColorString) => {
		directory.sendMessage('changeSettings', { wardrobeBackground: newColor });
	});

	// Don't show the picker, if it would have no effect
	if (accountSettings.wardrobeUseRoomBackground && isInRoom)
		return null;

	return (
		<ColorInput
			initialValue={ accountSettings.wardrobeBackground }
			onChange={ onChange }
			throttle={ 100 }
			hideTextInput={ true }
			inputColorTitle='Change background color'
		/>
	);
}
