import React, { Component } from 'react';
import SelectedStations from './Selection/SelectedStations';

class Info extends Component {
    render() {
        const p = this.props;
        const { selected, stations } = p;

        return (
            <div className='Info'>
                <h1>Debris Tracker</h1>
            </div>
        )
    }
}

export default Info;
