import React, { Component } from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.css';
import { ButtonGroup, Button } from 'react-bootstrap';
import io from 'socket.io-client';
import 'iframe-resizer/js/iframeResizer.contentWindow';

import AceEditor from 'react-ace';
import 'brace/mode/c_cpp';
import 'brace/theme/textmate';

import Select from './Select';

var AppStatus = {
  Ready: "Ready.",
  SendingToServer: "Sending to server...",
  Compiling: "Compiling...",
  CompileError: "Compile Error.",
  UploadError: "Upload Error.",
  Uploading: "Uploading...",
  Done: "Done."
};

class App extends Component {
  constructor(props) {
    super(props);

    this.checkForArduinoCreateAgent();

    this.board_options = [
      { value: "pololu:avr:a-star32U4", 
        label: "Pololu A-Star 32U4",
        commandline: "\"{runtime.tools.avrdude.path}/bin/avrdude\" \"-C{runtime.tools.avrdude.path}/etc/avrdude.conf\" {upload.verbose}  -patmega32u4 -cavr109 -P{serial.port} -b57600 -D \"-Uflash:w:{build.path}/{build.project_name}.hex:i\"",
        signature: "15a80bb8e911d82ee8c36d14bc5c00348f307ac8eaba5357366eeeb776a2e4eefa85a061d22ebde27482841de67e95d471700e8487adf3adda94d2b1091c68ab4d5b5098ad6f3f0e63878be52b3459a3966e82bbf0f160f13f2fcbc2ae06f296271f19bc8fef67e038b12746fc863e76df2929ee6f2f18b604825615179da99d6a62f9e6ac6ce88f4b80c1399c9e81b734c938b34cfc1147e111bafa2ccab786cc6649baa61e45f6bf8a7a41607052207f00b3fa1c10c518804d19de55af182019ee32d99405dedfd970cd0be57953b26c6b6ca3343e25a39936583cad9894e209a38c09eb8bd74d4df99812c8a939001f0242c544b43e5f853c02de949a29a8",
        wait_for_upload_port: true,
        use_1200bps_touch: true
      },
      { value: "arduino:avr:uno", 
        label: "Arduino Uno",
        commandline: "\"{runtime.tools.avrdude.path}/bin/avrdude\" \"-C{runtime.tools.avrdude.path}/etc/avrdude.conf\" {upload.verbose}  -patmega328p -carduino -P{serial.port} -b115200 -D \"-Uflash:w:{build.path}/{build.project_name}.hex:i\"",
        signature:"818f95e84bd149f2ad3cf82d383ca674b342f994921b34087afc6acc10b60370252fdf138a1f8e20666be623e13fdf976e4db145ded20cac7d324ae3f398093e8644f4f575bf65d988db0e9e4bd832756d54bc07b6478100c615ae49272f4b1eece680850fd8c63d772883783f4ea8e122a8e189e253c90978a6417cf4217e7c88d06fd2e470ffbad316537669b6db9b7de9709934aab3f12de5c3a2a8df30a91a84acf66487ed80cc286a50a598f855f4df4296eba07e49f054e0fec0d32b0928a68e6634cf656f41a3c663fbdf4e48b253dcfa02cc2d0826c216e4c2e979f5b43b1a2f171f75ea0fecf61b094a1896a8494eceda7899a4a02ca75d1f40790b",
        wait_for_upload_port: false,
        use_1200bps_touch: false
      },
      { value: "arduino:avr:micro", 
        label: "Arduino Micro",
        commandline: "\"{runtime.tools.avrdude.path}/bin/avrdude\" \"-C{runtime.tools.avrdude.path}/etc/avrdude.conf\" {upload.verbose}  -patmega32u4 -cavr109 -P{serial.port} -b57600 -D \"-Uflash:w:{build.path}/{build.project_name}.hex:i\"",
        signature: "15a80bb8e911d82ee8c36d14bc5c00348f307ac8eaba5357366eeeb776a2e4eefa85a061d22ebde27482841de67e95d471700e8487adf3adda94d2b1091c68ab4d5b5098ad6f3f0e63878be52b3459a3966e82bbf0f160f13f2fcbc2ae06f296271f19bc8fef67e038b12746fc863e76df2929ee6f2f18b604825615179da99d6a62f9e6ac6ce88f4b80c1399c9e81b734c938b34cfc1147e111bafa2ccab786cc6649baa61e45f6bf8a7a41607052207f00b3fa1c10c518804d19de55af182019ee32d99405dedfd970cd0be57953b26c6b6ca3343e25a39936583cad9894e209a38c09eb8bd74d4df99812c8a939001f0242c544b43e5f853c02de949a29a8",
        wait_for_upload_port: true,
        use_1200bps_touch: true
      },
    ];

    this.onBoardChange = this.onBoardChange.bind(this);
    this.onPortChange = this.onPortChange.bind(this);
    this.onEditorChange = this.onEditorChange.bind(this);
    this.onUpload = this.onUpload.bind(this);
    this.updatePorts = this.updatePorts.bind(this);
    this.monitorCompilation = this.monitorCompilation.bind(this);
    this.setUploadError = this.setUploadError.bind(this);

    this.state = {
      port_options: [],
      board: this.board_options[0],
      value: this.props.value,
      annotations: [],
      markers: [],
      status: AppStatus.Ready
    };
  }

  checkPorts(port) {
    let url = this.protocol + '://localhost:' + port + "/info";
    return fetch(url, {mode: 'cors'})
      .then((response) => {
        if(!response.ok) {
          throw new Error("Error fetching info");
        }
        return response;
      })
      .then((response) => response.json())
      .then((json) => {
        this.setupWebSocket(json);
      })
      .catch((error) => {
        if(port < 9000) { 
          this.checkPorts(port+1);
        } else {
          console.error("Couldn't find Arduino Create Agent");
        }
      });
  }

  checkForArduinoCreateAgent() {
    this.protocol = window.location.protocol.slice(0, -1);
    this.ws_protocol = this.protocol === "http" ? "ws" : "wss";

    this.checkPorts(8990);
  }

  setupWebSocket(info) {
    this.info = info;
    let ws = io(info[this.ws_protocol]);
    this.ws = ws;
    let thisApp = this;

    ws.on('connect', function() {
      ws.on('message', function(msg) {
        try {
          let obj = JSON.parse(msg);
          if(obj.Ports && !obj.Network) {
            let newState = { port_options: obj.Ports.map((port) => ( { value: port.Name, label: port.Name, port: port } ) ) };
            thisApp.setState((prevState, props) => {
              let port = newState.port_options[0];
              if(prevState.port) {
                let newPort = newState.port_options.find((element) => {
                  return element.value === prevState.port.value;
                });
                if(newPort) {
                  port = newPort;
                } else {
                  port = prevState.port;
                  port.disconnected = true;
                  port.bsStyle = "warning";
                  newState.port_options.unshift(port);
                }
              }
              newState.port = port;

              return newState;
            });
          } else if(obj.Flash && thisApp.state.status === AppStatus.Uploading) {
            thisApp.setState({ status: AppStatus.Done });
            clearTimeout(thisApp.uploadCountdown);
          } else if(obj.Msg === "Could not program the board") {
            clearTimeout(thisApp.uploadCountdown);
            thisApp.setUploadError();
          } else {
            if(!obj.Ports) {
              console.log(obj);
            }
          }
        } catch(e) {
        }

      });
      thisApp.updatePorts();
    });
  }

  setCompilerErrors(error) {
    this.setState({ 
      annotations: [
          { row: error.line_number-1, column: 0, type: "error", text: error.error }
      ],
      markers: [{ startRow: error.line_number-1, startCol: 0, endRow: error.line_number, endCol: 0, className: 'error-marker', type: 'background' }]
    });
  }

  uploadToArduino(hex, board) {
    if(this.state.port.disconnected) {
      // error, selected port isn't connected
    } else {
      var payload = JSON.stringify({
        board: board.value,
        port: this.state.port.value,
        commandline: board.commandline,
        signature: board.signature,
        hex: hex,
        filename: "sketch.hex",
        extra: {
          auth: {
            password: null
          },
          wait_for_upload_port: board.wait_for_upload_port,
          use_1200bps_touch: board.use_1200bps_touch,
          network: false,
          params_verbose: "-v",
          params_quiet: "-q -q",
          "verbose": false
        }
      });
      fetch(this.info[this.protocol] + "/upload", {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: payload
      }).catch((error) => { // response will be via web sockets
          console.error(error);
        });
    }
  }

  setUploadError() {
      this.setState({ status: AppStatus.UploadError });
  }

  monitorCompilation(linkObj, board) {
    let thisApp = this;
    fetch(linkObj.link)
      .then( (response) => response.json() )
      .then( (json) => {
        if(json.status === "success") {
          thisApp.setState({ status: AppStatus.Uploading });
          thisApp.uploadCountdown = setTimeout(thisApp.setUploadError, 30000); // after 30 seconds error out
          thisApp.uploadToArduino(json.hex, board);
        } else if(json.status === "compile_error") {
          // set annotations and markers
          thisApp.setCompilerErrors(json);
        } else {
          setTimeout(() => { thisApp.monitorCompilation(linkObj, board) }, 1000);
        }
      }).catch((error) => {
        console.error(error);
      });
  }

  onUpload() {
    let thisApp = this;
    this.setState({ status: AppStatus.SendingToServer });
    console.log("clicked update button");
    var board = this.state.board;
    var args = {
      script: this.state.value,
      board: board.value
    };
    fetch("/compilations", {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args)
    }).then( (response) => response.json() )
      .then( (json) => {
        thisApp.setState({ status: AppStatus.Compiling });
        thisApp.monitorCompilation(json, board);
      }).catch((error) => {
        console.error(error);
      });

  }

  onPortChange(newValue) {
    this.setState({ port: newValue });
  }

  onBoardChange(newValue) {
    this.setState({ board: newValue });
  }

  onEditorChange(newValue) {
    this.setState({ value: newValue, annotations: [], markers: [] });
  }

  updatePorts() {
    this.ws.emit('command', 'list');
    setTimeout(() => {
      this.updatePorts();
    }, 1000);
  }

  checkDisabled() {
    return this.state.status === AppStatus.SendingToServer ||
           this.state.status === AppStatus.Compiling ||
           this.state.status === AppStatus.Uploading;
  }

  render() {
    return (
      <div>
        <Select id="arduinoBoard" onChange={this.onBoardChange} options={this.board_options} selected={this.state.board} disabled={this.checkDisabled()} />
        <Select id="arduinoPort" onChange={this.onPortChange} options={this.state.port_options} selected={this.state.port} disabled={this.checkDisabled()}/>
        <ButtonGroup className="arduinoButton">
          <Button bsStyle="primary" onClick={this.onUpload} disabled={this.checkDisabled()}>Upload</Button>
        </ButtonGroup>
        <span>{this.state.status}</span>
        <AceEditor
          mode="c_cpp"
          theme="textmate"
          onChange={this.onEditorChange}
          name="arduinoEditor"
          value={this.state.value}
          editorProps={{$blockScrolling: true}}
          width="100%"
          height= "300px"
          annotations={this.state.annotations}
          markers={this.state.markers}
          />
      </div>
    );
  }
}

export default App;
