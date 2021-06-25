import React from 'react';
import ListGroup from 'react-bootstrap/ListGroup';
import {NavLink} from 'react-router-dom';
import Image from 'react-bootstrap/Image';

class Filters extends React.Component {

    componentDidMount(){
        if(this.props.mode!="public")
        this.props.onFilter(this.props.activeFilter);
    }


    createProject = (project) => {
        return (
            <NavLink key = {`#${project.userName}`} to = {`/tasks/${project.userId}`}><ListGroup.Item action active = {this.props.activeFilter === project.userId ? true : false} onClick = {() => this.props.onFilter(project.userId)}><Image width="20" height="20" className="img-button" src="/svg/browser.svg " alt ="" /*onClick={() => editTask(task)}*//>{ " User: "+project.userName}</ListGroup.Item></NavLink>
        );
    }
    
    render() {
        return (
            <>
                <ListGroup  variant="flush">
                    <NavLink key = "#all" to = "/tasks"><ListGroup.Item action active = {this.props.activeFilter === "all" ? true : false} id = "filter-all" onClick = {() => this.props.onFilter("all")}>All</ListGroup.Item></NavLink>
                   
                    <ListGroup.Item className="p-3 mt-5 list-title">Online Users</ListGroup.Item>
                    {this.props.projects.map(this.createProject) }
                </ListGroup>
            </>
        );
    }
}

export default Filters;
