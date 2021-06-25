import React, { useState }   from 'react';
import './App.css';
import Header from './components/Header';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Collapse from 'react-bootstrap/Collapse';
import Filters from './components/Filters';
import TodoList from './components/TodoList';
import Assignments from './components/Assignments';
import OnlineList from './components/OnlineList';
import TodoForm from './components/TodoForm';
import LoginForm from './components/LoginForm';
import API from './api/API';
import { Redirect, Route, Link } from 'react-router-dom';
import { Switch } from 'react-router';
import { AuthContext } from './auth/AuthContext';
import { withRouter } from 'react-router-dom';
const WSMessage = require('./components/ws_message.js');
const url = 'ws://localhost:5000'
let ws = new WebSocket(url)

class App extends React.Component {

        constructor(props) {
            super(props);
            this.state = { tasks: [], allTasks: [], projects: [], usersList: [], allUsers: [], filter: 'all', openMobileMenu: false, editedTask: null };
        }
       
        componentDidMount() {
                    
                    ws.onopen = () => {
                      ws.send('Message From Client') 
                      this.setState({ usersList: [] })
                    }
                    
                    ws.onerror = (error) => {
                      console.log(`WebSocket error: ${error}`)
                    }
                    
                    ws.onmessage = (e) => {
                      try {
                        console.log(e)
                          this.messageReceived(e);
                      } catch (error) {
                        console.log(error)
                      }
                      
                    }

            //check if the user is authenticated
            API.isAuthenticated().then(
                (user) => {
                    this.setState({ authUser: user });
                }
            ).catch((err) => {
                this.setState({ authErr: err.errorObj });
                this.props.history.push("/login");
            });
        }

        messageReceived(e) {
          let datas = JSON.parse(e.data.toString());
          if (datas.typeMessage == "login") {
            let flag = 0;
            for (var i = 0; i < this.state.usersList.length; i++) {
              if (this.state.usersList[i].userId == datas.userId) {
                flag = 1;
              }
            }
            if (flag == 0) {
              this.state.usersList.push(datas);
              this.setState({ usersList: this.state.usersList });
            }
          }
          if (datas.typeMessage == "logout") {
            for (var i = 0; i < this.state.usersList.length; i++) {
              if (this.state.usersList[i].userId == datas.userId) {
                this.state.usersList.splice(i, 1);
              }
            }
            this.setState({ usersList: this.state.usersList });
          }
          if (datas.typeMessage == "update") {
            let flag = 0;
            for (var i = 0; i < this.state.usersList.length; i++) {
              if (this.state.usersList[i].userId == datas.userId) {
                flag = 1;
                this.state.usersList[i] = datas;
                this.setState({ usersList: this.state.usersList });
              }
            }

            if (flag == 0) {
              this.state.usersList.push(datas);
              this.setState({ usersList: this.state.usersList });
            }
          }
        }

        handleErrors(err) {
            if (err) {
                if (err.status && err.status === 401) {
                    this.setState({ authErr: err.errorObj });
                    this.props.history.push("/login");
                }
            }
        }

        // Add a logout method
        logout = (username, password) => {
            API.userLogout(username, password).then(() => {
                this.setState({ authUser: null, authErr: null, tasks: null });
                API.getTasks().catch((errorObj) => { this.handleErrors(errorObj) });
            });
        }

        // Add a login method
        login = (username, password) => {
            API.userLogin(username, password).then(
                (user) => {
                    API.getTasks()
                        .then((tasks) => {
                            this.setState({ tasks: tasks, projects: this.getProjects(tasks), authUser: user, authErr: null });
                            this.props.history.push("/tasks");
                        })
                        .catch((errorObj) => {
                            this.handleErrors(errorObj);
                        });
                }
            ).catch(
                (errorObj) => {
                    const err0 = errorObj.errors[0];
                    this.setState({ authErr: err0 });
                }
            );
        }

        getProjects(tasks) {
            return [...new Set(tasks.map((task) => {
                if (task.project)
                    return task.project;
                else
                    return null;
            }))];
        }

        showSidebar = () => {
            this.setState((state) => ({ openMobileMenu: !state.openMobileMenu }));
        }

        getPublicTasks = (pageNumber) => {
            API.getPublicTasks(pageNumber)
                .then((tasks) => this.setState({ tasks: tasks }))
                .catch((errorObj) => {
                    this.handleErrors(errorObj);
                });
        }

        getUserTasks = (pageNumber) => {
      

          API.getTasks(pageNumber)
                        .then((tasks) => {
                            this.setState({ tasks: tasks, projects: this.getProjects(tasks), authUser: localStorage.getItem('user'), authErr: null });
                            this.props.history.push("/tasks");
                        })
                        .catch((errorObj) => {
                            this.handleErrors(errorObj);
                        });
      }

        getAllTasks = () => {
          API.getAllTasks()
              .then((tasks) => {
                this.state.allTasks = tasks;
                this.setState({ allTasks: tasks })})
              .catch((errorObj) => {
                  this.handleErrors(errorObj);
              });
       }

      

        selectTask = (taskId) => {
          API.selectTask(taskId);
        }
        
       

        filterTasks = (filter) => {
            if (filter === "all") {
                API.getTasks()
                    .then((tasks) => this.setState({ tasks: tasks, filter: 'all', projects: this.getProjects(tasks) }))
                    .catch((errorObj) => {
                        this.handleErrors(errorObj);
                    });
            } else {
                API.getTasks(filter)
                    .then((tasks) => {
                        this.setState({ tasks: tasks, filter: filter, projects: this.getProjects(tasks) });
                    })
                    .catch((errorObj) => {
                        this.handleErrors(errorObj);
                    });;
            }
        }

        assignTask = (userId,tasksId) => {
          for (var i = 0; i < tasksId.length; i++) {
            API.assignTask(Number(userId),tasksId[i]);
          }
          
        }

        unassignTask = (tasksId) => {
         
            API.unassignTask(tasksId);
           
            API.getTasks()
            .then((tasks) => {
                this.setState({ tasks: tasks, projects: this.getProjects(tasks), authUser: localStorage.getItem('user'), authErr: null });
                this.props.history.push("/tasks");
            })
            .catch((errorObj) => {
                this.handleErrors(errorObj);
            });
          
        }

        addOrEditTask = (task) => {
            if (!task.id) {
                //ADD
                API.addTask(task)
                    .then(() => {
                        //get the updated list of tasks from the server
                        API.getTasks().then((tasks) => this.setState({ tasks: tasks, filter: 'All', projects: this.getProjects(tasks) }));
                    })
                    .catch((errorObj) => {
                        this.handleErrors(errorObj);
                    });
            } else {
                //UPDATE
                API.updateTask(task)
                    .then(() => {
                        //get the updated list of tasks from the server
                        API.getTasks().then((tasks) => this.setState({ tasks: tasks, filter: 'All', projects: this.getProjects(tasks) }));
                    })
                    .catch((errorObj) => {
                        this.handleErrors(errorObj);
                    });
            }
        }

        editTask = (task) => {
            this.setState({ editedTask: task });
        }

        deleteTask = (task) => {
            API.deleteTask(task.id)
                .then(() => {
                    //get the updated list of tasks from the server
                    API.getTasks().then((tasks) => this.setState({ tasks: tasks, filter: 'All', projects: this.getProjects(tasks) }));
                })
                .catch((errorObj) => {
                    this.handleErrors(errorObj);
                });
        }

        getUsers = () => {
          API.getUsers()
              .then((users) => {
                this.state.allUsers = users;
                this.setState({ allUsers : users});
              })
              .catch((errorObj) => {
                  this.handleErrors(errorObj);
              });
      }

        

        render() {
                // compose value prop as object with user object and logout method
                const value = {
                    authUser: this.state.authUser,
                    authErr: this.state.authErr,
                    loginUser: this.login,
                    logoutUser: this.logout
                }
				   return( 
      <AuthContext.Provider value={value}>
        
        <Header showSidebar={this.showSidebar} getPublicTasks = {this.getPublicTasks}/>

        <Container fluid>

          <Switch>
            <Route path="/login">
              <Row className="vheight-100">
                <Col sm={4}></Col>
                <Col sm={4} className="below-nav"> 
                  <LoginForm/>
                </Col>
              </Row>
            </Route>

            <Route path="/public">
              <Row className="vheight-100">
                <Col sm={4} bg="light" id="left-sidebar" className="collapse d-sm-block below-nav">
                        <Filters mode = "public"  projects = {this.state.usersList} onFilter = {this.filterTasks} activeFilter = "all"/>
                </Col>
                <Col sm={6} className="below-nav"> 
                  <h5><strong>Public Tasks</strong></h5>
                  <TodoList  tasks = {this.state.tasks} mode = "public" getPublicTasks = {this.getPublicTasks} />                  
                </Col>                
              </Row>
            </Route>

            <Route path="/assignment">
              <Row className="vheight-100">
              <Col sm={4} bg="light" id="left-sidebar" className="collapse d-sm-block below-nav">
                        <Filters projects = {this.state.usersList} onFilter = {this.filterTasks} activeFilter = "all"/>
              </Col>
              <Col sm={8} bg="light" id="left-sidebar" className="collapse d-sm-block below-nav">
                        <Assignments allUsers = {this.state.allUsers} allTasks = {this.state.allTasks} mode = "public" getAllTasks = {this.getAllTasks} getUsers = {this.getUsers} assignTask = {this.assignTask} />
                        
              </Col>         
              </Row>
            </Route>

            <Route path="/online">
              <Row className="vheight-100">
              <Col sm={4} bg="light" id="left-sidebar" className="collapse d-sm-block below-nav">
                        <Filters projects = {this.state.usersList} onFilter = {this.filterTasks} activeFilter = "all"/>
                      </Col>
                <Col sm={8} className="below-nav"> 
                  <h5><strong>Online Users</strong></h5>
                    <div className="user">
                        <OnlineList  usersList={this.state.usersList} ws={ws} />
                   </div>  
                </Col>
              </Row>
            </Route>

            <Route path="/tasks">
              <Row className="vheight-100">
                <Switch>
                  <Route path="/tasks/:filter"  render={({match}) => {
                      return <Collapse in={this.state.openMobileMenu}>
                        <Col sm={4} bg="light" id="left-sidebar" className="collapse d-sm-block below-nav">
                          <Filters projects = {this.state.usersList} onFilter = {this.filterTasks}  activeFilter = {match.params.filter}/>
                        </Col>
                      </Collapse>;
                  }}/> 
                  <Route render={({match}) => {
                      return <Collapse in={this.state.openMobileMenu}>
                      <Col sm={4} bg="light" id="left-sidebar" className="collapse d-sm-block below-nav">
                        <Filters projects = {this.state.usersList}   onFilter = {this.filterTasks} activeFilter = "all"/>
                      </Col>
                    </Collapse>;
                  }}/>
                      
                </Switch>

                <Col sm={8} className="below-nav"> 
                  <h5><strong>Filter: </strong>{this.state.filter}</h5>
                  <TodoList getUserTasks={this.getUserTasks}   unassignTask={this.unassignTask} mode = "private" tasks = {this.state.tasks} usersList = {this.state.usersList} selectTask= {this.selectTask} editTask = {this.editTask} updateTask = {this.addOrEditTask} deleteTask = {this.deleteTask} />
                  <Link to = "/add"><Button variant="success" size="lg" className="fixed-right-bottom">&#43;</Button></Link>
                </Col>
              </Row>
            </Route>

            <Route path="/add">
              <Row className="vheight-100">
                <Col sm={4}></Col>
                <Col sm={4} className="below-nav"> 
                  <TodoForm addOrEditTask={this.addOrEditTask}/>
                </Col>
              </Row>
            </Route>

            <Route path='/task/:id' render={(props) => {
              let taskToUpdate = this.state.tasks.find((t)=>(t.id==props.match.params.id));
              return (<Row className="vheight-100">
                        <Col sm={4}></Col>
                        <Col sm={4} className="below-nav"> 
                          <TodoForm addOrEditTask={this.addOrEditTask} task={taskToUpdate}/>
                        </Col>
                      </Row>);
            }}/>

            <Route>
              <Redirect to='/tasks' />
            </Route>

          </Switch>            

          
        </Container>
      </AuthContext.Provider>
    );
  }
}

export default withRouter(App);