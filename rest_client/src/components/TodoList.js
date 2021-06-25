import React,{ useEffect } from 'react';
import TodoItem from './TodoItem';
import ListGroup from 'react-bootstrap/ListGroup';
import {Redirect} from 'react-router-dom';
import {AuthContext} from '../auth/AuthContext'
import Pagination from "react-js-pagination";

const TodoList = (props) => {

  let {mode, tasks, editTask, updateTask, deleteTask, getPublicTasks,selectTask,usersList, getUserTasks,unassignTask} = props;

  //same as componentDidMount()
  useEffect(() => {
    if(mode === "public"){
      getPublicTasks();
    }
  }, []);

  // total records per page to display
  const recordPerPage = 10;
  
  // range of pages in paginator
  const pageRange = 10;

   // handle change event
   const handlePageChange = pageNumber => {
    if(mode === "public"){
      console.log("### i am in public")
      getPublicTasks(pageNumber);
    }else   getUserTasks(pageNumber);
    // call API to get data based on pageNumber
  }


  return(
    <AuthContext.Consumer>
      {(context) => (
        <>
        {context.authErr && <Redirect to = "/login"></Redirect>}
        
        {tasks && 
        <ListGroup as="ul" variant="flush">
          {tasks.map((task) => <TodoItem mode = {mode} unassignTask={unassignTask} usersList = {usersList} key = {task.id} task = {task} selectTask={selectTask} editTask = {editTask} updateTask = {updateTask} deleteTask = {deleteTask} />) }
        </ListGroup>
        
        }
        
        <Pagination 
          itemClass="page-item" // add it for bootstrap 4
          linkClass="page-link" // add it for bootstrap 4
          activePage={localStorage.getItem("currentPage")}
          itemsCountPerPage={localStorage.getItem("totalItems")/localStorage.getItem("totalPages")}
          totalItemsCount={localStorage.getItem("totalItems")}
          pageRangeDisplayed={pageRange}
          onChange={handlePageChange}
          pageSize ={localStorage.getItem("totalPages")}
      />
        </>
      )}
    </AuthContext.Consumer>
  );
}

export default TodoList;
