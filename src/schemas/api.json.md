# api.json 规范 (OpenAPI 3.0)

必含顶层: openapi, info, servers, paths, components.securitySchemes, components.schemas
每个接口必须: summary(中文), description, tags, security, parameters(含description和type), requestBody(含required和所有字段的description+校验规则), responses(200/400/401/403/404/500)
components.schemas: 抽取重复结构用$ref引用，每个字段含type+description+example

校验规则示例: minLength/maxLength/pattern/minimum/maximum/enum/default
required数组: 列出所有必填字段名
