import React, { ReactElement } from 'react';
import { Navigate } from 'react-router';
import { useCharacterIsInChatroom } from '../gameContext/chatRoomContextProvider';
import { DivContainer } from '../common/container/container';
import { ChatRoomScene } from './chatRoomScene';
import { Tab, TabContainer } from '../common/tabs/tabs';
import { WardrobeContextProvider } from '../wardrobe/wardrobeContext';
import { WardrobeExpressionGui } from '../wardrobe/views/wardrobeExpressionsView';
import { WardrobePoseGui } from '../wardrobe/views/wardrobePoseView';
import { usePlayerState } from '../gameContext/playerContextProvider';
import { Chat } from './chat';
import { Scrollable } from '../common/scrollbar/scrollbar';
import { ChatroomControls } from './chatroomControls';
import './chatroom.scss';
import { useCurrentAccountSettings } from '../gameContext/directoryConnectorContextProvider';
import { useIsPortrait } from '../../styles/mediaQueries';
import { ChatInputContextProvider } from './chatInput';

export function Chatroom(): ReactElement | null {
	const isInChatRoom = useCharacterIsInChatroom();
	const { interfaceChatroomGraphicsRatioHorizontal, interfaceChatroomGraphicsRatioVertical } = useCurrentAccountSettings();
	const isPortrait = useIsPortrait();

	if (!isInChatRoom) {
		return <Navigate to='/chatroom_select' />;
	}

	const chatroomGraphicsRatio = isPortrait ? interfaceChatroomGraphicsRatioVertical : interfaceChatroomGraphicsRatioHorizontal;
	const chatroomChatRatio = 10 - chatroomGraphicsRatio;

	return (
		<ChatInputContextProvider>
			<DivContainer className='chatroom' direction={ isPortrait ? 'column' : 'row' }>
				<ChatRoomScene className={ `chatroom-scene flex-${chatroomGraphicsRatio}` } />
				<InteractionBox className={ `interactionArea flex-${chatroomChatRatio}` } />
			</DivContainer>
		</ChatInputContextProvider>
	);
}

function InteractionBox({ className }: {
	className?: string;
}): ReactElement {
	const { player, playerState } = usePlayerState();

	return (
		<TabContainer className={ className } collapsable>
			<Tab name='Chat'>
				<Chat />
			</Tab>
			<Tab name='Room'>
				<Scrollable color='dark' className='controls-container flex-1'>
					<ChatroomControls />
				</Scrollable>
			</Tab>
			<Tab name='Pose'>
				<WardrobeContextProvider player={ player } target={ player }>
					<WardrobePoseGui character={ player } characterState={ playerState } />
				</WardrobeContextProvider>
			</Tab>
			<Tab name='Expressions'>
				<WardrobeContextProvider player={ player } target={ player }>
					<WardrobeExpressionGui character={ player } characterState={ playerState } />
				</WardrobeContextProvider>
			</Tab>
		</TabContainer>
	);
}
