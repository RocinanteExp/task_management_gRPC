import Task from './Task';
import User from './User';
const baseURL = "/api";

async function isAuthenticated() {

    const userId = localStorage.getItem('userId')
    if( userId == undefined ) {
        let err = { param: "Client", msg: "Not logged in" };
        throw err;
    }
    return userId;
}

async function getTasks(filter) {
    const userId = localStorage.getItem('assignee')
    if( userId == undefined ) {
        let err = { param: "Client", msg: "Not logged in" };
        throw err;
    }
    let url = "/tasks" + localStorage.getItem('assignee');

    if (filter) {
        const queryParams = "&pageNo=" + filter;
        url += queryParams;
    }
    const response = await fetch(baseURL + url);
    const responseJson = await response.json();
    
    localStorage.setItem('totalPages',  responseJson.totalPages);
    localStorage.setItem('currentPage', responseJson.currentPage);
    localStorage.setItem('totalItems',  responseJson.totalItems);
    const tasksJson = responseJson.tasks;
    if (response.ok) {
        //return tasksJson.map((t) => Task.from(t));
        return tasksJson.map((t) => new Task(t.id, t.description, t.important, t.privateTask, t.deadline, t.project, t.completed, t.user));
    } else {
        let err = { status: response.status, errObj: tasksJson };
        throw err; // An object with the error coming from the server
    }
}


async function getPublicTasks(filter) {
    let url = "/tasks/public";


    if (filter) {
        const queryParams = "?pageNo=" + filter;
        url += queryParams;
    }

    const response = await fetch(baseURL + url);
    const responseJson = await response.json();
    localStorage.setItem('totalPages',  responseJson.totalPages);
    localStorage.setItem('currentPage', responseJson.currentPage);
    localStorage.setItem('totalItems',  responseJson.totalItems);
    const tasksJson = responseJson.tasks;
    if (response.ok) {
        //return tasksJson.map((t) => Task.from(t));
        return tasksJson.map((t) => new Task(t.id, t.description, t.important, t.privateTask, t.deadline, t.project, t.completed, t.user));
    } else {
        let err = { status: response.status, errObj: tasksJson };
        throw err; // An object with the error coming from the server
    }
}

async function unassignTask(taskId) {
    return new Promise((resolve, reject) => {
        let userId = localStorage.getItem("user")
        fetch(baseURL + "/tasks/"+taskId+"/assignees/"+userId, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then((response) => {
            if (response.ok) {
               resolve(null)
            } else {
                // analyze the cause of error
                response.json()
                    .then((obj) => { reject(obj); }) // error msg in the response body
                    .catch((err) => { reject({ errors: [{ param: "Application", msg: "Cannot parse server response" }] }) }); // something else
            }
        }).catch((err) => { reject({ errors: [{ param: "Server", msg: "Cannot communicate" }] }) }); // connection errors
    });
}

async function assignTask(userId,taskId) {
    return new Promise((resolve, reject) => {
        //let userId = Number( localStorage.getItem("user"))
        fetch(baseURL + "/tasks/"+taskId+"/assignees", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: userId, email:localStorage.getItem("email"), name:localStorage.getItem("name")}),
        }).then((response) => {
            if (response.ok) {
               resolve(null)
            } else {
                // analyze the cause of error
                response.json()
                    .then((obj) => { reject(obj); }) // error msg in the response body
                    .catch((err) => { reject({ errors: [{ param: "Application", msg: "Cannot parse server response" }] }) }); // something else
            }
        }).catch((err) => { reject({ errors: [{ param: "Server", msg: "Cannot communicate" }] }) }); // connection errors
    });


}


async function addTask(task) {
    return new Promise((resolve, reject) => {
        
        delete task['deadlineDate']
        delete task['deadlineTime']
        delete task['project']        
        delete task['submitted']
        task['private'] = false
        delete task['privateTask']
        fetch(baseURL + "/tasks", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(task),
        }).then((response) => {
            if (response.ok) {
                response.json().then((id) => {
                    resolve(id);
                });
            } else {
                // analyze the cause of error
                response.json()
                    .then((obj) => { reject(obj); }) // error msg in the response body
                    .catch((err) => { reject({ errors: [{ param: "Application", msg: "Cannot parse server response" }] }) }); // something else
            }
        }).catch((err) => { reject({ errors: [{ param: "Server", msg: "Cannot communicate" }] }) }); // connection errors
    });
}

async function updateTask(task) {
    return new Promise((resolve, reject) => {
        delete task['deadlineDate']
        delete task['deadlineTime']   
        delete task['submitted']
        task['private'] = task['privateTask']
        delete task['privateTask']
        
        fetch(baseURL + "/tasks/" + task.id, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(task),
        }).then((response) => {
            if (response.ok) {

            } else {
                // analyze the cause of error
                response.json()
                    .then((obj) => { reject(obj); }) // error msg in the response body
                    .catch((err) => { reject({ errors: [{ param: "Application", msg: "Cannot parse server response" }] }) }); // something else
            }
        }).catch((err) => { reject({ errors: [{ param: "Server", msg: "Cannot communicate" }] }) }); // connection errors
    });
}


async function deleteTask(taskId) {
    return new Promise((resolve, reject) => {
        fetch(baseURL + "/tasks/" + taskId, {
            method: 'DELETE'
        }).then((response) => {
            if (response.ok) {
                resolve(null);
            } else {
                // analyze the cause of error
                response.json()
                    .then((obj) => { reject(obj); }) // error msg in the response body
                    .catch((err) => { reject({ errors: [{ param: "Application", msg: "Cannot parse server response" }] }) }); // something else
            }
        }).catch((err) => { reject({ errors: [{ param: "Server", msg: "Cannot communicate" }] }) }); // connection errors
    });
}

async function userLogin(username, password) {
    if(username==undefined ||  password==undefined){
        let err = { param: "Client", msg: "Not logged in" };
        throw err;
    }
    
    return new Promise((resolve, reject) => {
        fetch(baseURL + '/users/authenticator?type=login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: username, password: password }),
        }).then((response) => {
            if (response.ok) {
                response.json().then((id) => {
                    localStorage.setItem('assignee', "?assignee=" + id.id);
                    localStorage.setItem('userId', "?userId=" + id.id);
                    localStorage.setItem('user',  id.id);
                    localStorage.setItem('email', username);
                    localStorage.setItem('name', id.name);
                    resolve(id.id);
                });
            } else {
                // analyze the cause of error
                response.json()
                    .then((obj) => { reject(obj); }) // error msg in the response body
                    .catch((err) => { reject({ errors: [{ param: "Application", msg: "Cannot parse server response" }] }) }); // something else
            }
        }).catch((err) => { reject({ errors: [{ param: "Server", msg: "Cannot communicate" }] }) }); // connection errors
    });
}


async function selectTask(taskId){
    return new Promise((resolve, reject) => {
        fetch(baseURL + '/users/'+localStorage.getItem('user')+'/selection', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: taskId}),
        }).then((response) => {
            if (response.ok) {
             
            } else {
                // analyze the cause of error
                response.json()
                    .then((obj) => { reject(obj); }) // error msg in the response body
                    .catch((err) => { reject({ errors: [{ param: "Application", msg: "Cannot parse server response" }] }) }); // something else
            }
        }).catch((err) => { reject({ errors: [{ param: "Server", msg: "Cannot communicate" }] }) }); 
    });
}

async function getAllTasks() {

    let url = baseURL + "/tasks";
    let allTasks = [];
    let finished = false;

    while(!finished){
        const response = await fetch(url);
        const responseJson = await response.json();
        const tasksJson = responseJson.tasks;

        if (response.ok) {
            tasksJson.forEach(
                (t) => {
                    let task = new Task(t.id, t.description, t.important, t.privateTask, t.deadline, t.project, t.completed, t.user);
                    allTasks.push(task);
                }
            );
            if(responseJson.next == undefined){
                finished = true;
            } else {
                url = responseJson.next;
            }

        } else {
            let err = { status: response.status, errObj: tasksJson };
            throw err; // An object with the error coming from the server
        }

    }

    return allTasks;

}


async function getUsers() {

        let url = "/users";

        const response = await fetch(baseURL + url);
        const responseJson = await response.json();
        if (response.ok) {
            return responseJson.map((u) => new User(u.id, u.name, u.email));
        } else {
            let err = { status: response.status, errObj: responseJson };
            throw err; // An object with the error coming from the server
        }

}

async function userLogout(username, password) {
    
    return new Promise((resolve, reject) => {
        const email = localStorage.getItem('email')
        fetch(baseURL + '/users/authenticator?type=logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email, password: password }),
        }).then((response) => {
            if (response.ok) {
                localStorage.removeItem('userId');
                resolve(null);
            } else {
                // analyze the cause of error
                response.json()
                    .then((obj) => { reject(obj); }) // error msg in the response body
                    .catch((err) => { reject({ errors: [{ param: "Application", msg: "Cannot parse server response" }] }) }); // something else
            }
        });
    });
}

const API = {unassignTask, isAuthenticated, selectTask,getTasks, getPublicTasks, addTask, updateTask, deleteTask, userLogin, userLogout,assignTask, getAllTasks, getUsers};
export default API;