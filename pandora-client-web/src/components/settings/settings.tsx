import React, { ReactElement } from 'react';
import './settings.scss';
import { GIT_DESCRIBE } from '../../config/Environment';
import { Tab, TabContainer } from '../common/tabs/tabs';
import { AccountSettings } from './accountSettings';
import { useNavigate } from 'react-router-dom';
import { CharacterSettings } from './characterSettings';

export function Settings(): ReactElement | null {
	const navigate = useNavigate();

	return (
		<>
			<div className='settings'>
				<TabContainer className='flex-1'>
					<Tab name='Account'>
						<div className='settings-tab'>
							<div className='settings-tab-contents'>
								<AccountSettings />
							</div>
						</div>
					</Tab>
					<Tab name='Character'>
						<div className='settings-tab'>
							<div className='settings-tab-contents'>
								<CharacterSettings />
							</div>
						</div>
					</Tab>
					<Tab name='Graphics'>
						<div className='settings-tab'>
							<div className='settings-tab-contents'>
								Work in progress
							</div>
						</div>
					</Tab>
					<Tab name='◄ Back' className='slim' onClick={ () => navigate(-1) } />
				</TabContainer>
			</div>
			<footer>Version: { GIT_DESCRIBE }</footer>
		</>
	);
}
