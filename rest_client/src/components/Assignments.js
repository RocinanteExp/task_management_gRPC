
import React,{ useEffect } from 'react';
import _ from 'lodash'
import { Dropdown } from 'semantic-ui-react'
import Button from 'react-bootstrap/Button';


const Assignments = (props) => {
  
  let { allTasks, getAllTasks,getUsers,allUsers,assignTask} = props;
  let tasksArray = [];
  let userId="-1";

  //same as componentDidMount()
  useEffect(() => {
      getUsers();
      getAllTasks();
  }, []);
  
  
  
  const usersOptions = _.map(allUsers, (id, index) => ({
    key: allUsers[index].userId,
    text: allUsers[index].userName,
    value: allUsers[index].userId,
  }))
  
  function assignUsers() {
    assignTask(userId,tasksArray);
   
  }

  const handleUsersDropdown = (e, { value }) => {
    userId = value;
    console.log(value)
  }

  const handleTasksDropdown = (e, { value }) => {
    console.log(value)
    tasksArray =(value);
  }
  

  const stateOptions = _.map(allTasks, (id, index) => ({
    key: allTasks[index].id,
    text: allTasks[index].description,
    value: allTasks[index].id,
  }))
  
  console.log(stateOptions)
  
   return (
     <div>
        <Dropdown placeholder='Users' fluid clearable selection options={usersOptions} onChange={handleUsersDropdown} />
        <Dropdown placeholder='Tasks' fluid multiple clearable selection options={stateOptions} onChange={handleTasksDropdown}/>
        <Button onClick={assignUsers} variant="success" size="lg" className="fixed-right-bottom">&#43;</Button>
     </div>
  
   );
}

export default Assignments;