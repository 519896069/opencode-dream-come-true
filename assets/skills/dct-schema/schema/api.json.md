# 阶段二：api.json 产物规范

## 产物说明

| 产物 | 说明 |
|------|------|
| `prd/{YYYY-MM-DD-<英文简述>}/api.json` | 接口设计文档（OpenAPI 3.0 格式） |

## 格式要求

必须遵循 **OpenAPI 3.0.0** 规范。

## 必填字段

### 顶层结构

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "{需求名称} API",
    "version": "1.0.0",
    "description": "{需求描述}"
  },
  "servers": [
    {
      "url": "http://localhost:{port}",
      "description": "开发环境"
    }
  ],
  "paths": {},
  "components": {
    "securitySchemes": {
      "BearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    },
    "schemas": {}
  }
}
```

### paths 规范

每个接口必须包含：

1. **summary**：接口中文名称
2. **description**：接口功能说明
3. **tags**：模块分组
4. **security**（需要鉴权的接口）：`[{ "BearerAuth": [] }]`
5. **parameters**（Query/Path 参数）：每个参数必须有 `description`（中文）、`schema`、`required`
6. **requestBody**（POST/PUT/PATCH）：
   - `required: true`
   - `content.application/json.schema`：包含所有字段定义
   - 每个字段必须有 `description`（中文）
   - 必填字段列在 `required` 数组中
   - 校验规则：`minLength`/`maxLength`/`pattern`/`minimum`/`maximum`/`enum`
7. **responses**：
   - `200`：成功响应，包含完整响应体 schema，每个字段有中文 `description`
   - `400`：参数错误
   - `401`：未认证（需要鉴权的接口）
   - `403`：无权限
   - `404`：资源不存在（涉及单个资源的接口）
   - `500`：服务器错误

### components.schemas 规范

将重复使用的请求/响应结构定义为 schema，通过 `$ref` 引用。

每个 schema 的字段必须包含：
- `type`：字段类型
- `description`：中文说明
- `example`：示例值

## 示例

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "文章管理 API",
    "version": "1.0.0",
    "description": "文章管理模块接口"
  },
  "servers": [
    { "url": "http://localhost:8080", "description": "开发环境" }
  ],
  "paths": {
    "/api/article": {
      "get": {
        "summary": "获取文章列表",
        "description": "分页查询文章列表，支持关键词、分类、标签、状态筛选",
        "tags": ["文章"],
        "security": [{ "BearerAuth": [] }],
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "required": false,
            "description": "页码，默认 1",
            "schema": { "type": "integer", "default": 1, "minimum": 1 }
          },
          {
            "name": "keyword",
            "in": "query",
            "required": false,
            "description": "标题关键词搜索",
            "schema": { "type": "string", "maxLength": 100 }
          }
        ],
        "responses": {
          "200": {
            "description": "成功",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": { "type": "integer", "description": "状态码，0表示成功", "example": 0 },
                    "message": { "type": "string", "description": "提示信息", "example": "success" },
                    "data": {
                      "type": "object",
                      "properties": {
                        "list": {
                          "type": "array",
                          "description": "文章列表",
                          "items": { "$ref": "#/components/schemas/Article" }
                        },
                        "total": { "type": "integer", "description": "总条数" },
                        "page": { "type": "integer", "description": "当前页码" },
                        "page_size": { "type": "integer", "description": "每页条数" }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": { "description": "未认证或 Token 已过期" },
          "500": { "description": "服务器内部错误" }
        }
      },
      "post": {
        "summary": "创建文章",
        "description": "创建一篇新文章",
        "tags": ["文章"],
        "security": [{ "BearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["title", "author", "category_id", "content"],
                "properties": {
                  "title": { "type": "string", "description": "文章标题", "minLength": 1, "maxLength": 255 },
                  "author": { "type": "string", "description": "作者名称", "minLength": 1, "maxLength": 100 },
                  "category_id": { "type": "integer", "description": "分类ID" },
                  "content": { "type": "string", "description": "正文内容（富文本HTML）", "minLength": 1 },
                  "sort_content": { "type": "string", "description": "摘要" },
                  "is_top": { "type": "integer", "description": "是否置顶：0否，1是", "enum": [0, 1], "default": 0 },
                  "publish_time": { "type": "string", "format": "date-time", "description": "发布时间" },
                  "tag_ids": { "type": "array", "description": "标签ID数组", "items": { "type": "integer" } }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "成功",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": { "type": "integer", "description": "状态码", "example": 0 },
                    "message": { "type": "string", "description": "提示信息", "example": "success" },
                    "data": {
                      "type": "object",
                      "properties": {
                        "id": { "type": "string", "description": "新创建的文章ID" }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": { "description": "参数错误（必填字段缺失或格式错误）" },
          "401": { "description": "未认证" },
          "500": { "description": "服务器内部错误" }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "BearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    },
    "schemas": {
      "Article": {
        "type": "object",
        "description": "文章",
        "properties": {
          "id": { "type": "string", "description": "文章ID" },
          "title": { "type": "string", "description": "文章标题" },
          "author": { "type": "string", "description": "作者" },
          "category": {
            "type": "object",
            "description": "分类信息",
            "properties": {
              "id": { "type": "string", "description": "分类ID" },
              "name": { "type": "string", "description": "分类名称" }
            }
          },
          "tags": {
            "type": "array",
            "description": "标签列表",
            "items": {
              "type": "object",
              "properties": {
                "id": { "type": "string", "description": "标签ID" },
                "name": { "type": "string", "description": "标签名称" }
              }
            }
          },
          "status": { "type": "integer", "description": "状态：1已发布，2已下架" },
          "is_top": { "type": "integer", "description": "是否置顶：0否，1是" },
          "publish_time": { "type": "string", "description": "发布时间" },
          "created_at": { "type": "string", "description": "创建时间" }
        }
      }
    }
  }
}
```

## 质量标准

- 必须是合法的 JSON，可通过 OpenAPI linter 验证
- 所有字段必须有中文 `description`
- 需要鉴权的接口必须带 `security: [{ "BearerAuth": [] }]`
- 每个接口必须定义错误响应（至少 401 和 500）
- requestBody 中必须包含校验规则（required、minLength、maxLength 等）
- 重复结构必须抽取为 `components.schemas`，通过 `$ref` 引用
