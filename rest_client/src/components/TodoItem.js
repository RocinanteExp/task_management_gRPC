import React, { useState }  from 'react';
import moment from 'moment';
import Image from 'react-bootstrap/Image';
import ListGroup from 'react-bootstrap/ListGroup';
import { Link } from 'react-router-dom' ;


const TodoItem = (props) => {
   const [select,setSelected] = useState(1)

  let {mode,task, deleteTask, updateTask,selectTask,usersList,unassignTask} = props;

  const onChangeTask = (task) => {
    if(mode === "private"){
      setSelected(task.id);
      selectTask(task.id);
    }
  }
  let selectedInfo=0;
 if(mode === "private"){
  for(var i=0;i<usersList.length;i++){
    if(usersList[i].userId==localStorage.getItem('user')){
      selectedInfo =  usersList[i].taskId
    }
  }
}

  return (
    <ListGroup.Item id = {task.id}>
      <div className="d-flex w-100 justify-content-between">
          <div >
          {mode === "private" && <input type="radio" name="asdads" value={task.id} checked={selectedInfo===task.id}  onChange={() => onChangeTask(task)}/>}{"   "+task.description}
          {mode === "public"}

            
            <span className="badge badge-success ml-4">{task.project}</span>
          </div>
          {!task.privateTask && mode === "public" &&
            <small>{task.user}</small>
          }
          {!task.privateTask && (
                <svg className="bi bi-person-square" width="1.2em" height="1.2em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M14 1H2a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V2a1 1 0 00-1-1zM2 0a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V2a2 2 0 00-2-2H2z" clipRule="evenodd"/>
                  <path fillRule="evenodd" d="M2 15v-1c0-1 1-4 6-4s6 3 6 4v1H2zm6-6a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                </svg>)}


          {task.deadline &&  (
            <small className = {task.deadline.isBefore(moment()) ? "date bg-danger text-white" : "date"}>{task.deadline.format("dddd, MMMM Do YYYY, h:mm:ss a")} </small>
          )}
          
          {mode === "private" && <div>
            <Link to ={`/task/${task.id}`}><Image width="20" height="20" className="img-button" src="/svg/edit.svg" alt ="" /*onClick={() => editTask(task)}*//></Link>
            <Image width="20" height="20" className="img-button" src="/svg/delete.svg" alt ="" onClick={() => deleteTask(task)}/>
            <Image width="20" height="20" className="img-button" src="/svg/pin.svg" alt ="" onClick={() => unassignTask(task.id)}/>
          </div>}

        </div>
    </ListGroup.Item>
  );
}
export default TodoItem;
