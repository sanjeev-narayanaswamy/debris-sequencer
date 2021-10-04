import React, { Component } from 'react';
import SelectedStations from './Selection/SelectedStations';
import DateTime from './dateTime';

class Info extends Component {
    render() {
        const p = this.props;
        const { selected, stations } = p;

        return (
            <div className='Info'>
                <h1>Debris Sequencer</h1>
                <DateTime></DateTime>
            </div>
        )
    }
}

export default Info;
