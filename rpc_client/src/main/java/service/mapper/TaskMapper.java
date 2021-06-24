package service.mapper;

import org.json.JSONArray;
import org.json.JSONObject;
import service.Task;
import service.User;

import java.util.Locale;

public class TaskMapper {
    private static void setUserField(User.Builder userBuilder, String name, Object value) {
        switch (name) {
            case "email":
                userBuilder.setEmail((String) value);
                break;
            default:
                break;
        }
    }

    private static void setTaskField(Task.Builder taskBuilder, String name, Object value) {
        switch (name) {
            case "description":
                taskBuilder.setDescription((String) value);
                break;
            case "important":
                taskBuilder.setImportant((Boolean) value);
                break;
            case "private":
                taskBuilder.setPrivate((Boolean) value);
                break;
            case "project":
                String projVal = (String) value;
                taskBuilder.setProject(Task.ProjectEnum.valueOf(projVal.toUpperCase()));
                break;
            case "deadline":
                taskBuilder.setDeadline((String) value);
                break;
            case "completed":
                taskBuilder.setCompleted((Boolean) value);
                break;
            case "assignees":
                JSONArray userJSONs = (JSONArray) value;
                for (Object userJson : userJSONs) {
                    taskBuilder.addAssignees(fromJSONObjToUserMessage((JSONObject) userJson));
                }
                break;
        }
    }

    private static User fromJSONObjToUserMessage(JSONObject jsonObj) {
        User.Builder userBuilder = User.newBuilder();
        jsonObj.keySet().forEach(keyStr -> setUserField(userBuilder, keyStr, jsonObj.get(keyStr)));
        return userBuilder.build();
    }

    public static Task fromJSONObjToTaskMessage(JSONObject jsonObj) {
        Task.Builder taskBuilder = Task.newBuilder();
        jsonObj.keySet().forEach(keyStr -> setTaskField(taskBuilder, keyStr, jsonObj.get(keyStr)));
        return taskBuilder.build();
    }
}
