package service.validator;

import org.everit.json.schema.Schema;
import org.everit.json.schema.loader.SchemaClient;
import org.everit.json.schema.loader.SchemaLoader;
import org.json.JSONObject;
import org.json.JSONTokener;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;

public class TaskValidator {
    public static Schema loadTaskSchema(String schemaPath) throws IOException {
        try (InputStream inputStream = TaskValidator.class.getResourceAsStream(schemaPath)) {
            if (inputStream == null) throw new FileNotFoundException("task schema " + schemaPath + " not found");
            JSONObject jsonSchema = new JSONObject(new JSONTokener(inputStream));

            return SchemaLoader
                    .builder()
                    .schemaClient(SchemaClient.classPathAwareClient())
                    .schemaJson(jsonSchema)
                    .resolutionScope("classpath:///")
                    .build()
                    .load()
                    .build();
        }
    }

    public static void validateJsonAgainstSchema(Schema schema, JSONObject jsonSubject) {
        schema.validate(jsonSubject);
    }
}
