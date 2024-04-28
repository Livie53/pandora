import { GetLogger, LogLevel, SetConsoleOutput } from 'pandora-common';
import React, { ReactElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { GraphicsManager } from '../assets/graphicsManager';
import { useEvent } from '../common/useEvent';
import { EulaGate } from '../components/Eula';
import { Button } from '../components/common/button/button';
import { LoadSearchArgs } from '../config/searchArgs';
import { ConfigurePixiSettings } from '../graphics/pixiSettings';
import '../index.scss';
import { TOAST_OPTIONS_ERROR } from '../persistentToast';
import '../styles/globalUtils.scss';
import { LoadAssetsFromAssetDevServer, LoadAssetsFromFileSystem, LoadAssetsFromOfficialLink } from './assetLoader';
import { AssetManagerEditor } from './assets/assetManager';
import { EditorWardrobeContextProvider } from './components/wardrobe/wardrobe';
import { Editor, EditorView } from './editor';
import { EditorContextProvider, useMaybeEditor, useSetEditor } from './editorContextProvider';

const logger = GetLogger('init');

Start().catch((error) => {
	logger.fatal('Init failed:', error);
});

/**
 * Starts the application.
 */
async function Start(): Promise<void> {
	LoadSearchArgs();
	SetupLogging();
	ConfigurePixiSettings();
	logger.info('Starting...');
	createRoot(document.querySelector('#editor-root') as HTMLElement).render(
		<React.StrictMode>
			<EulaGate>
				<BrowserRouter basename='/editor'>
					<EditorContextProvider>
						<ToastContainer
							theme='dark'
							style={ {
								position: 'absolute',
							} }
							toastStyle={ { backgroundColor: '#333' } }
							position='top-left'
						/>
						<AssetLoaderElement />
					</EditorContextProvider>
				</BrowserRouter>
			</EulaGate>
		</React.StrictMode>,
	);
	return Promise.resolve();
}

/**
 * Configures logging for the application.
 */
function SetupLogging(): void {
	SetConsoleOutput(LogLevel.DEBUG);
}

function AssetLoaderElement() {
	const editor = useMaybeEditor();
	const setEditor = useSetEditor();
	const [pending, setPending] = useState(false);

	const load = useEvent(async (setLoading: (loading: boolean) => void, loadManager: () => Promise<[AssetManagerEditor, GraphicsManager]>) => {
		if (pending)
			return;

		setPending(true);
		setLoading(true);

		try {
			const [assetManager, graphicsManager] = await loadManager();
			setEditor(new Editor(assetManager, graphicsManager));
		} catch (e) {
			if (e instanceof Error) {
				toast.error(`Failed to load:\n${e.message}`, TOAST_OPTIONS_ERROR);
			} else {
				toast.error(`Failed to load:\n${e as string}`, TOAST_OPTIONS_ERROR);
			}
			logger.error('Failed to load:', e);
			setPending(false);
			setLoading(false);
		}
	});

	if (editor) {
		return (
			<EditorWardrobeContextProvider>
				<EditorView />
			</EditorWardrobeContextProvider>
		);
	}

	return (
		<div style={ { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexFlow: 'column', gap: '1rem' } }>
			<ButtonLoadFromFileSystem pending={ pending } load={ load } />
			<ButtonLoadDirectLink pending={ pending } load={ load } />
			<ButtonLoadOfficialLink pending={ pending } load={ load } />
		</div>
	);
}

function ButtonLoadFromFileSystem({ pending, load }: { pending: boolean; load: (setLoading: (loading: boolean) => void, loadManager: () => Promise<[AssetManagerEditor, GraphicsManager]>) => Promise<void>; }): ReactElement {
	const [loading, setLoading] = useState(false);
	const supported = 'showDirectoryPicker' in window;
	const text = supported ? 'Load Assets From File System' : 'File System Access API Not Supported';

	return (
		<Button onClick={ () => void load(setLoading, LoadAssetsFromFileSystem) } disabled={ pending || !supported }>{ loading ? 'Loading...' : text }</Button>
	);
}

function ButtonLoadDirectLink({ pending, load }: { pending: boolean; load: (setLoading: (loading: boolean) => void, loadManager: () => Promise<[AssetManagerEditor, GraphicsManager]>) => Promise<void>; }): ReactElement | null {
	const [loading, setLoading] = useState(false);

	return (
		<Button onClick={ () => void load(setLoading, LoadAssetsFromAssetDevServer) } disabled={ pending }>{ loading ? 'Loading...' : 'Load Assets From Local Development Server' }</Button>
	);
}

function ButtonLoadOfficialLink({ pending, load }: { pending: boolean; load: (setLoading: (loading: boolean) => void, loadManager: () => Promise<[AssetManagerEditor, GraphicsManager]>) => Promise<void>; }): ReactElement {
	const [loading, setLoading] = useState(false);

	return (
		<Button onClick={ () => void load(setLoading, LoadAssetsFromOfficialLink) } disabled={ pending }>{ loading ? 'Loading...' : 'Load Assets From Official Link' }</Button>
	);
}
