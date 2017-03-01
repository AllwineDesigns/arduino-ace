import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './index.css';

ReactDOM.render(
  <App value={document.getElementById('root').innerHTML}/>,
  document.getElementById('root')
);
