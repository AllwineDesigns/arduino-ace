import React, { PureComponent } from 'react';
import { ButtonGroup, DropdownButton, MenuItem } from 'react-bootstrap';

class Select extends PureComponent {
  constructor(props) {
    super(props);

    this.onSelect = this.onSelect.bind(this);
    this.onToggle = this.onToggle.bind(this);

    if(this.props.options.length) {
      this.state = {
        selected: this.props.options[0]
      }
    } else {
      this.state = {};
    }
  }

  onSelect(eventKey, event) {
    var sel = this.props.options.find((element) => { 
        return element.value === eventKey 
    });
    if(this.props.onChange && sel !== this.props.selected) {
      this.props.onChange(sel);
    }
  }

  onToggle(open) {
    if(open && this.props.onOpen) {
      this.props.onOpen();
    }
  }

  render() {
    const listItems = this.props.options.map((option) =>
      <MenuItem eventKey={option.value} key={option.value}>{option.label}</MenuItem>
    );
    return (
      <ButtonGroup className="arduinoBoards arduinoButton">
        <DropdownButton disabled={this.props.disabled} bsStyle={this.props.selected ? this.props.selected.bsStyle : "default"} title={this.props.selected ? this.props.selected.label : "Select..."} id={this.props.id} onSelect={this.onSelect} onToggle={this.onToggle}>
          {listItems}
        </DropdownButton>
      </ButtonGroup>
    );
  }
}

export default Select;
