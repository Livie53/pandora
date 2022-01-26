import { SocketInterface, RecordOnly, SocketInterfaceArgs, SocketInterfaceUnconfirmedArgs, SocketInterfaceResult, SocketInterfaceResponseHandler, SocketInterfaceOneshotHandler, SocketInterfaceNormalResult, SocketInterfacePromiseResult } from './helpers';
import { MessageHandler } from './message_handler';

/** Directory->Client message about current status of the client/account */
export type IDirectoryClientConnectionStateUpdate = {
	account: string | null;
};

/** Directory->Client handlers */
interface DirectoryClient {
	connectionState(arg: IDirectoryClientConnectionStateUpdate): void;
}

export type IDirectoryClient = SocketInterface<DirectoryClient>;
export type IDirectoryClientArgument = RecordOnly<SocketInterfaceArgs<DirectoryClient>>;
export type IDirectoryClientUnconfirmedArgument = SocketInterfaceUnconfirmedArgs<DirectoryClient>;
export type IDirectoryClientResult = SocketInterfaceResult<DirectoryClient>;
export type IDirectoryClientPromiseResult = SocketInterfacePromiseResult<DirectoryClient>;
export type IDirectoryClientNormalResult = SocketInterfaceNormalResult<DirectoryClient>;
export type IDirectoryClientResponseHandler = SocketInterfaceResponseHandler<DirectoryClient>;
export type IDirectoryClientOneshotHandler = SocketInterfaceOneshotHandler<DirectoryClient>;
export type IDirectoryClientMessageHandler<Context> = MessageHandler<DirectoryClient, Context>;
export type IDirectoryClientBase = DirectoryClient;
