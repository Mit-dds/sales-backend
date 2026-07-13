const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Property Sales API',
    version: '1.0.0',
    description: 'Backend API for Shujjaudin Property Sales',
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server',
    },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'API is running',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new agent account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Registration successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TokenAuthResponse' },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '409': {
            description: 'Email or phone already registered',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login by email or phone',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TokenAuthResponse' },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '403': {
            description: 'Account not active (pending, inactive, or removed)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access and refresh tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token refreshed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TokenResponse' },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Invalid or expired refresh token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Invalid or expired token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/profile': {
      put: {
        tags: ['Auth'],
        summary: 'Update profile — name text field, photo and/or watermark file uploads',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', minLength: 2, maxLength: 100, description: 'Full name (optional)' },
                  photo: { type: 'string', format: 'binary', description: 'Profile photo (optional, JPEG/PNG/GIF/WebP, max 5MB)' },
                  watermark: { type: 'string', format: 'binary', description: 'Watermark image (optional, JPEG/PNG/GIF/WebP, max 5MB)' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Profile updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout (invalidates client-side tokens)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Logged out successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset OTP',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ForgotPasswordInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'OTP sent if account exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
              },
            },
          },
          '429': {
            description: 'Too many requests',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/verify-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Verify OTP and get reset token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VerifyOtpInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'OTP verified',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        resetToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid or expired OTP',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password using reset token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResetPasswordInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password reset successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
              },
            },
          },
          '400': {
            description: 'Invalid or expired reset token or weak password',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List all users with pagination and search (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['PENDING', 'ACTIVE', 'INACTIVE', 'REMOVED'] },
            description: 'Filter by status',
            required: false,
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
            description: 'Page number',
            required: false,
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 10 },
            description: 'Items per page',
            required: false,
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Search by name or email',
            required: false,
          },
          {
            name: 'includeRemoved',
            in: 'query',
            schema: { type: 'string', enum: ['true', 'false'] },
            description: 'Include REMOVED users',
            required: false,
          },
        ],
        responses: {
          '200': {
            description: 'Users retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        users: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/User' },
                        },
                        pagination: {
                          type: 'object',
                          properties: {
                            page: { type: 'integer' },
                            limit: { type: 'integer' },
                            total: { type: 'integer' },
                            totalPages: { type: 'integer' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '403': {
            description: 'Not an admin',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/admin/users/{userId}': {
      get: {
        tags: ['Admin'],
        summary: 'Get user details (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'User details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/admin/users/{userId}/status': {
      patch: {
        tags: ['Admin'],
        summary: 'Update user account status (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    enum: ['PENDING', 'ACTIVE', 'INACTIVE', 'REMOVED'],
                    description: 'New account status',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'User status updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid status value or self-lockout attempt',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '403': {
            description: 'Not an admin',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    // ---------- Project CRUD ----------
    '/api/projects': {
      get: {
        tags: ['Projects', 'New Offer'],
        summary: 'Enhanced — List all projects with full fields for the New Offer flow',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 }, description: 'Items per page (max 100)' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by project name' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['Off-plan', 'Ready'] }, description: 'Filter by status' },
        ],
        responses: {
          '200': { description: 'Projects retrieved with full new-offer fields', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectListResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      post: {
        tags: ['Projects'],
        summary: 'Create a new project (admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectInput' } } } },
        responses: {
          '201': { description: 'Project created', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/projects/{projectId}': {
      get: {
        tags: ['Projects'],
        summary: 'Get single project with unitTypes, subtypes, paymentPlans',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Project retrieved', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectDetailResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      put: {
        tags: ['Projects'],
        summary: 'Update project (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectInput' } } } },
        responses: {
          '200': { description: 'Project updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      delete: {
        tags: ['Projects'],
        summary: 'Delete project and all children (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Project deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    // ---------- Uploads (Master Plan) ----------
    '/api/projects/{projectId}/upload': {
      post: {
        tags: ['Master Plan'],
        summary: 'Upload a file (hero image or master plan) for a project (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'type', in: 'query', required: true, schema: { type: 'string', enum: ['hero', 'master-plan'] }, description: 'Upload type: hero (JPG/PNG) or master-plan (PDF/JPG/PNG)' },
        ],
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } } },
        responses: {
          '200': { description: 'File uploaded', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectResponse' } } } },
          '400': { description: 'Invalid file type, missing file, or missing query param', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/projects/{projectId}/file': {
      delete: {
        tags: ['Master Plan'],
        summary: 'Remove a project file (hero image or master plan) by type (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'type', in: 'query', required: true, schema: { type: 'string', enum: ['hero', 'master-plan'] }, description: 'File type to delete: hero or master-plan' },
        ],
        responses: {
          '200': { description: 'File removed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectResponse' } } } },
          '400': { description: 'Invalid type', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/projects/{projectId}/master-plan': {
      get: {
        tags: ['Master Plan'],
        summary: 'Get master plan info for a project (any authenticated user)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Master plan info', content: { 'application/json': { schema: { $ref: '#/components/schemas/MasterPlanResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    // ---------- Why Buy ----------
    '/api/projects/{projectId}/why-buy': {
      get: {
        tags: ['Why Buy'],
        summary: 'Get why buy items for a project (any authenticated user)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Why buy items', content: { 'application/json': { schema: { $ref: '#/components/schemas/WhyBuyResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      post: {
        tags: ['Why Buy'],
        summary: 'Replace all why buy items for a project (admin only). The request body becomes the authoritative list — items not in the array are removed.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/WhyBuyItemsInput' } } } },
        responses: {
          '201': { description: 'Why buy item added', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/projects/{projectId}/why-buy/ai-suggestions': {
      get: {
        tags: ['Why Buy'],
        summary: 'Get AI-generated why buy suggestions via Google Gemini (any authenticated user)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'AI suggestions', content: { 'application/json': { schema: { $ref: '#/components/schemas/WhyBuyAISuggestionsResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '502': { description: 'AI service unavailable (Gemini API failed, fallback suggestions returned)', content: { 'application/json': { schema: { $ref: '#/components/schemas/WhyBuyAISuggestionsResponse' } } } },
        },
      },
    },
    '/api/projects/{projectId}/why-buy/{index}': {
      delete: {
        tags: ['Why Buy'],
        summary: 'Remove a why buy item by index (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'index', in: 'path', required: true, schema: { type: 'integer', minimum: 0 } },
        ],
        responses: {
          '200': { description: 'Why buy item removed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectResponse' } } } },
          '400': { description: 'Invalid index or out of bounds', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    // ---------- Unit Types ----------
    '/api/projects/{projectId}/unit-types': {
      get: {
        tags: ['Unit Types'],
        summary: 'Get all unit types for a project with subtype labels, floor plan flags, and full payment plan details',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Unit types retrieved', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnitTypesSummaryResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      post: {
        tags: ['Unit Types'],
        summary: 'Create or update a unit type with subtypes — optionally include floor plan files (admin only)',
        description: 'Accepts either JSON (label + subtypes array) or multipart/form-data with nested object keys. If `unitTypeId` is provided and the unit type exists, it updates the label/virtualTour and upserts subtypes. Each subtype can include `id` (to update existing), `label`, `floorPlan` (file to upload), and `clearFloorPlan` (set to `true` to remove an existing floor plan). Subtypes without an `id` are created as new. The API dynamically accepts any index N — fields shown below are examples up to index 9.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UnitTypeInput' } },
            'multipart/form-data': { schema: { $ref: '#/components/schemas/UnitTypeInputMultipart' } },
          },
        },
        responses: {
          '201': { description: 'Unit type created (with floor plan data if files were uploaded)', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnitTypeDetailResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/projects/{projectId}/unit-types/{unitTypeId}': {
      get: {
        tags: ['Unit Types'],
        summary: 'Get a single unit type with subtypes and payment plans (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'unitTypeId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Unit type retrieved', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnitTypeDetailResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project or unit type not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      put: {
        tags: ['Unit Types'],
        summary: 'Update unit type label and/or virtualTour (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'unitTypeId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UnitTypeUpdateInput' } } } },
        responses: {
          '200': { description: 'Unit type updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnitTypeDetailResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project or unit type not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      delete: {
        tags: ['Unit Types'],
        summary: 'Delete a unit type and all children (subtypes, payment plans, floor plan files) (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'unitTypeId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Unit type deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project or unit type not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/projects/{projectId}/unit-types/{unitTypeId}/subtypes': {
      put: {
        tags: ['Unit Types'],
        summary: 'Batch update subtypes — rename, create, and optionally upload floor plans (admin only)',
        description: 'Accepts JSON (subtypes array with id + label) or multipart/form-data with nested object keys (subtypes[0][id], subtypes[0][label], subtypes[0][floorPlan], etc.). Items with id rename existing; items without id create new. The API accepts any index N up to 9.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'unitTypeId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/BatchSubTypeUpdateInput' } },
            'multipart/form-data': { schema: { $ref: '#/components/schemas/BatchSubTypeUpdateInputMultipart' } },
          },
        },
        responses: {
          '200': { description: 'Subtypes updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/BatchSubTypeUpdateResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project, unit type, or subtype not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/projects/{projectId}/unit-types/{unitTypeId}/subtypes/{subTypeId}': {
      delete: {
        tags: ['Unit Types'],
        summary: 'Delete a subtype and its floor plan file (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'unitTypeId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'subTypeId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Subtype deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project, unit type, or subtype not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/projects/{projectId}/unit-types/{unitTypeId}/payment-plans/templates': {
      get: {
        tags: ['Payment Plans'],
        summary: 'Get 7 template payment plans (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'unitTypeId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Template plans retrieved', content: { 'application/json': { schema: { $ref: '#/components/schemas/TemplatePlansResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/projects/{projectId}/unit-types/{unitTypeId}/payment-plans': {
      post: {
        tags: ['Payment Plans'],
        summary: 'Save payment plans for a unit type (bulk replace) (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'unitTypeId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentPlansInput' } } } },
        responses: {
          '200': { description: 'Payment plans saved', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentPlansResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project or unit type not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/projects/{projectId}/unit-types/{unitTypeId}/payment-plans/save': {
      post: {
        tags: ['Payment Plans'],
        summary: 'Create a single payment plan (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'unitTypeId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentPlanInput' } } } },
        responses: {
          '201': { description: 'Payment plan created', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentPlanSingleResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project or unit type not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/projects/{projectId}/unit-types/{unitTypeId}/payment-plans/{planId}': {
      get: {
        tags: ['Payment Plans'],
        summary: 'Get a single payment plan with computed onHandover (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'unitTypeId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'planId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Payment plan retrieved', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentPlanSingleResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Payment plan not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      put: {
        tags: ['Payment Plans'],
        summary: 'Update a single payment plan (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'unitTypeId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'planId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentPlanInput' } } } },
        responses: {
          '200': { description: 'Payment plan updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentPlanSingleResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Payment plan not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      delete: {
        tags: ['Payment Plans'],
        summary: 'Delete a single payment plan (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'unitTypeId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'planId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Payment plan deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Payment plan not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/projects/{projectId}/unit-types/{unitTypeId}/floor-plans': {
      get: {
        tags: ['Floor Plans'],
        summary: 'Get floor plan info for all subtypes of a unit type (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'unitTypeId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Floor plans retrieved', content: { 'application/json': { schema: { $ref: '#/components/schemas/FloorPlansListResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project or unit type not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/projects/{projectId}/unit-types/{unitTypeId}/subtypes/{subTypeId}/floor-plan': {
      post: {
        tags: ['Floor Plans'],
        summary: 'Upload a floor plan file for a subtype (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'unitTypeId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'subTypeId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } } },
        responses: {
          '200': { description: 'Floor plan uploaded', content: { 'application/json': { schema: { $ref: '#/components/schemas/SubTypeResponse' } } } },
          '400': { description: 'Invalid file type or missing file', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project, unit type, or subtype not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      delete: {
        tags: ['Floor Plans'],
        summary: 'Delete a floor plan file from a subtype (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'unitTypeId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'subTypeId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Floor plan deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SubTypeResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project, unit type, or subtype not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    // ---------- Availability ----------
    '/api/availability': {
      delete: {
        tags: ['Availability'],
        summary: 'Delete all availability data (admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'All availability data cleared', content: { 'application/json': { schema: { $ref: '#/components/schemas/DeleteUnitResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/availability/import': {
      post: {
        tags: ['Availability'],
        summary: 'Import availability from Excel file (admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary', description: 'Excel file (.xlsx, .xls)' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Availability imported', content: { 'application/json': { schema: { $ref: '#/components/schemas/ImportAvailabilityResponse' } } } },
          '400': { description: 'Invalid file', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Not an admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/availability/projects': {
      get: {
        tags: ['Availability'],
        summary: 'Get all projects that have units with availability (admin/agent)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'List of projects with unit counts', content: { 'application/json': { schema: { $ref: '#/components/schemas/AvailabilityProjectsResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    // ---------- New Offer ----------
    '/api/availability/{projectId}/units': {
      get: {
        tags: ['New Offer'],
        summary: 'Step 2 — Get all availability units for a project. Supports search by unit number and filter by unit type.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by unit number (case-insensitive partial match)', required: false },
          { name: 'unitType', in: 'query', schema: { type: 'string' }, description: 'Filter by exact unit type label (e.g. "3BR", "4BR")', required: false },
        ],
        responses: {
          '200': { description: 'Project units', content: { 'application/json': { schema: { $ref: '#/components/schemas/AvailabilityUnitsResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Project not found or has no units', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/availability/{projectId}/units/{unitId}/payment-plans': {
      get: {
        tags: ['New Offer'],
        summary: 'Step 3 — Get payment plans for a specific unit',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'unitId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Unit payment plans with computed onHandover', content: { 'application/json': { schema: { $ref: '#/components/schemas/AvailabilityPaymentPlansResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Unit not found or does not belong to this project', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    // ---------- Offers ----------
    '/api/offers': {
      post: {
        tags: ['New Offer'],
        summary: 'Step 4 — Save a generated offer',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateOfferInput' },
            },
          },
        },
        responses: {
          '201': { description: 'Offer saved', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Offer' } } } } } },
          '400': { description: 'Missing required fields', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      get: {
        tags: ['Offers'],
        summary: 'List saved offers (agent sees own, admin sees all)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by client name or unit number' },
          { name: 'projectId', in: 'query', schema: { type: 'string' } },
          { name: 'offerMode', in: 'query', schema: { type: 'string', enum: ['normal', 'event', 'allplans', 'comparison', 'recovery'] } },
          { name: 'agentName', in: 'query', schema: { type: 'string' }, description: 'Filter by agent name (admin only)' },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['createdAt', 'clientName', 'projectName', 'netPrice'], default: 'createdAt' } },
          { name: 'sortDir', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        ],
        responses: {
          '200': { description: 'Paginated offers list', content: { 'application/json': { schema: { $ref: '#/components/schemas/OffersListResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    // ---------- Settings ----------
    '/api/settings': {
      get: {
        tags: ['Settings'],
        summary: 'Get app settings (currency rates, team name)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Settings object', content: { 'application/json': { schema: { $ref: '#/components/schemas/SettingsResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      put: {
        tags: ['Settings'],
        summary: 'Update currency rates and team name (admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateSettingsInput' },
            },
          },
        },
        responses: {
          '200': { description: 'Settings updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SettingsResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Forbidden — admin only', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/pdf/generate': {
      post: {
        tags: ['PDF'],
        summary: 'Generate a server-side PDF for an offer',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['offerData', 'template'],
                properties: {
                  offerData: {
                    type: 'object',
                    description: 'Complete offer data (project, unit, plan, schedule, fees, etc.)',
                  },
                  template: {
                    type: 'string',
                    enum: ['single-offer', 'comparison', 'all-plans'],
                    description: 'Which EJS template to render',
                  },
                  format: {
                    type: 'string',
                    enum: ['A4', 'A3'],
                    description: 'PDF page size (default: A4)',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'PDF file (application/pdf)',
            content: { 'application/pdf': {} },
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/pdf/preview': {
      post: {
        tags: ['PDF'],
        summary: 'Generate a base64 preview of an offer PDF',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/PdfGenerateInput',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Base64-encoded PDF string',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'string', description: 'Base64-encoded PDF content' },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', nullable: true },
          profileEmail: { type: 'string', format: 'email', nullable: true },
          role: { type: 'string', enum: ['agent', 'admin'] },
          status: { type: 'string', enum: ['PENDING', 'ACTIVE', 'INACTIVE', 'REMOVED'] },
          photo: { type: 'string', nullable: true },
          watermark: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      RegisterInput: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100, description: 'Full name' },
          email: { type: 'string', format: 'email', description: 'Login email' },
          password: { type: 'string', minLength: 6, description: 'Password' },
          phone: { type: 'string', description: 'Phone number (digits only, 7-15)' },
          profileEmail: { type: 'string', format: 'email', description: 'Display email on profile' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['password'],
        oneOf: [{ required: ['email'] }, { required: ['phone'] }],
        properties: {
          email: { type: 'string', format: 'email', description: 'Login email' },
          phone: { type: 'string', description: 'Phone number' },
          password: { type: 'string', description: 'Password' },
        },
      },
      RefreshInput: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', description: 'Refresh token' },
        },
      },
      TokenAuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              accessToken: { type: 'string', description: 'JWT access token (15 min)' },
              refreshToken: { type: 'string', description: 'JWT refresh token (30 days)' },
            },
          },
        },
      },
      TokenResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              accessToken: { type: 'string', description: 'New JWT access token (15 min)' },
              refreshToken: { type: 'string', description: 'New JWT refresh token (30 days)' },
            },
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      MessageResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
        },
      },
      ForgotPasswordInput: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email', description: 'Registered email address' },
        },
      },
      VerifyOtpInput: {
        type: 'object',
        required: ['email', 'otp'],
        properties: {
          email: { type: 'string', format: 'email' },
          otp: { type: 'string', minLength: 6, maxLength: 6, description: '6-digit OTP' },
        },
      },
      ResetPasswordInput: {
        type: 'object',
        required: ['resetToken', 'newPassword'],
        properties: {
          resetToken: { type: 'string', description: 'Reset token from verify-otp response' },
          newPassword: { type: 'string', minLength: 6, description: 'New password (min 6 characters)' },
        },
      },
      // ---------- Project Schemas ----------
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          location: { type: 'string' },
          type: { type: 'string', enum: ['Apartments', 'Townhouses', 'Mixed'] },
          status: { type: 'string', enum: ['Off-plan', 'Ready'] },
          completionDate: { type: 'string' },
          feeLabel: { type: 'string' },
          feePct: { type: 'number' },
          feeFixed: { type: 'number' },
          utilityAmount: { type: 'number' },
          parkingCost: { type: 'number' },
          bookingToken: { type: 'number' },
          day7Payment: { type: 'number' },
          primaryColor: { type: 'string' },
          secondaryColor: { type: 'string' },
          dpSplitOptions: { type: 'array', items: { type: 'integer' } },
          disclaimer: { type: 'string', nullable: true },
          heroImagePath: { type: 'string', nullable: true, description: 'Path to hero image file' },
          masterPlanPath: { type: 'string', nullable: true, description: 'Path to master plan file' },
          masterPlanName: { type: 'string', nullable: true, description: 'Original filename of master plan' },
          masterPlanIsImage: { type: 'boolean', nullable: true, description: 'Whether master plan is an image (true) or PDF (false)' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ProjectInput: {
        type: 'object',
        required: ['name', 'location', 'type', 'status', 'completionDate', 'feeLabel', 'feePct', 'feeFixed', 'utilityAmount', 'parkingCost', 'bookingToken', 'primaryColor', 'secondaryColor'],
        properties: {
          name: { type: 'string', description: 'Project name' },
          location: { type: 'string', description: 'Project location' },
          type: { type: 'string', enum: ['Apartments', 'Townhouses', 'Mixed'] },
          status: { type: 'string', enum: ['Off-plan', 'Ready'], description: 'Project status' },
          completionDate: { type: 'string', description: 'Expected completion date' },
          feeLabel: { type: 'string', description: 'Label for the fee field' },
          feePct: { type: 'number', description: 'Fee percentage' },
          feeFixed: { type: 'number', description: 'Fixed fee amount' },
          utilityAmount: { type: 'number' },
          parkingCost: { type: 'number' },
          bookingToken: { type: 'number' },
          primaryColor: { type: 'string' },
          secondaryColor: { type: 'string' },
          dpSplitOptions: { type: 'array', items: { type: 'integer' }, description: 'Available DP split options in months' },
          disclaimer: { type: 'string', description: 'Disclaimer text' },
        },
      },
      ProjectResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object', properties: { project: { $ref: '#/components/schemas/Project' } } },
        },
      },
      ProjectListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              projects: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    location: { type: 'string' },
                    type: { type: 'string', enum: ['Apartments', 'Townhouses', 'Mixed'] },
                    status: { type: 'string', enum: ['Off-plan', 'Ready'] },
                    completionDate: { type: 'string' },
                    unitTypes: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          label: { type: 'string' },
                          planTypes: { type: 'array', items: { type: 'string', enum: ['normal', 'event', 'both'] } },
                        },
                      },
                    },
                    whyBuyCount: { type: 'integer' },
                  },
                },
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
                  total: { type: 'integer' },
                  totalPages: { type: 'integer' },
                },
              },
            },
          },
        },
      },
      ProjectDetailResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              project: {
                allOf: [
                  { $ref: '#/components/schemas/Project' },
                  {
                    type: 'object',
                    properties: {
                    unitTypeCount: { type: 'integer', description: 'Number of unit types' },
                    totalPlans: { type: 'integer', description: 'Total payment plans across all unit types' },
                    unitTypes: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            label: { type: 'string' },
                            virtualTour: { type: 'string', nullable: true },
                            subtypes: { type: 'array', items: { $ref: '#/components/schemas/SubType' } },
                            paymentPlans: { type: 'array', items: { $ref: '#/components/schemas/PaymentPlan' } },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      // ---------- Why Buy Schemas ----------
      WhyBuyItemsInput: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            items: { type: 'string', maxLength: 500 },
            description: 'Authoritative list of why-buy texts. Entries not in this array are removed.',
          },
        },
      },
      WhyBuyResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              whyBuy: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
      WhyBuyAISuggestionsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              suggestions: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
      MasterPlanResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              heroImagePath: { type: 'string', nullable: true },
              masterPlanPath: { type: 'string', nullable: true },
              masterPlanName: { type: 'string', nullable: true },
              masterPlanIsImage: { type: 'boolean', nullable: true },
            },
          },
        },
      },
      // ---------- Unit Type Schemas ----------
      UnitType: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          projectId: { type: 'string' },
          label: { type: 'string' },
          virtualTour: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      UnitTypeInput: {
        type: 'object',
        required: ['label', 'subtypes'],
        properties: {
          label: { type: 'string', description: 'Unit type label (e.g. Studio, 1BR, 2BR, 3BR)' },
          subtypes: {
            type: 'array',
            minItems: 1,
            description: 'Array of subtype names or objects. Accepts either ["A","B"] or [{"label":"A"},{"label":"B"}]',
            items: {
              oneOf: [
                { type: 'string', description: 'Subtype label (e.g. "Type A")' },
                {
                  type: 'object',
                  required: ['label'],
                  properties: {
                    label: { type: 'string', description: 'Subtype label' },
                  },
                },
              ],
            },
          },
          virtualTour: { type: 'string', nullable: true, description: 'Matterport or VR tour URL (optional)' },
        },
      },
      UnitTypeInputMultipart: {
        type: 'object',
        required: ['label', 'subtypes[0][label]'],
        properties: {
          label: { type: 'string', description: 'Unit type label (e.g. Studio, 1BR, 2BR, 3BR)' },
          'subtypes[0][label]': { type: 'string', description: 'Label for the first subtype' },
          'subtypes[0][floorPlan]': { type: 'string', format: 'binary', description: 'Floor plan file for the first subtype (PDF, JPG, PNG — max 10MB)' },
          'subtypes[1][label]': { type: 'string', description: 'Label for the second subtype (optional)' },
          'subtypes[1][floorPlan]': { type: 'string', format: 'binary', description: 'Floor plan file for the second subtype (optional)' },
          'subtypes[2][label]': { type: 'string', description: 'Label for the third subtype (optional)' },
          'subtypes[2][floorPlan]': { type: 'string', format: 'binary', description: 'Floor plan file for the third subtype (optional)' },
          'subtypes[3][label]': { type: 'string', description: 'Label for the fourth subtype (optional)' },
          'subtypes[3][floorPlan]': { type: 'string', format: 'binary', description: 'Floor plan file for the fourth subtype (optional)' },
          'subtypes[4][label]': { type: 'string', description: 'Label for the fifth subtype (optional)' },
          'subtypes[4][floorPlan]': { type: 'string', format: 'binary', description: 'Floor plan file for the fifth subtype (optional)' },
          'subtypes[5][label]': { type: 'string', description: 'Label for the sixth subtype (optional)' },
          'subtypes[5][floorPlan]': { type: 'string', format: 'binary', description: 'Floor plan file for the sixth subtype (optional)' },
          'subtypes[6][label]': { type: 'string', description: 'Label for the seventh subtype (optional)' },
          'subtypes[6][floorPlan]': { type: 'string', format: 'binary', description: 'Floor plan file for the seventh subtype (optional)' },
          'subtypes[7][label]': { type: 'string', description: 'Label for the eighth subtype (optional)' },
          'subtypes[7][floorPlan]': { type: 'string', format: 'binary', description: 'Floor plan file for the eighth subtype (optional)' },
          'subtypes[8][label]': { type: 'string', description: 'Label for the ninth subtype (optional)' },
          'subtypes[8][floorPlan]': { type: 'string', format: 'binary', description: 'Floor plan file for the ninth subtype (optional)' },
          'subtypes[9][label]': { type: 'string', description: 'Label for the tenth subtype (optional)' },
          'subtypes[9][floorPlan]': { type: 'string', format: 'binary', description: 'Floor plan file for the tenth subtype (optional)' },
          virtualTour: { type: 'string', nullable: true, description: 'Matterport or VR tour URL (optional)' },
        },
      },
      UnitTypeUpdateInput: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'Unit type label (e.g. Studio, 1BR, 2BR, 3BR)' },
          virtualTour: { type: 'string', nullable: true, description: 'Matterport or VR tour URL (optional)' },
        },
      },
      UnitTypeDetailResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              unitType: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  projectId: { type: 'string' },
                  label: { type: 'string' },
                  virtualTour: { type: 'string', nullable: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                  subtypes: { type: 'array', items: { $ref: '#/components/schemas/SubType' } },
                  paymentPlans: { type: 'array', items: { $ref: '#/components/schemas/PaymentPlan' } },
                },
              },
            },
          },
        },
      },
      SubType: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          unitTypeId: { type: 'string' },
          label: { type: 'string' },
          floorPlanPath: { type: 'string', nullable: true },
          floorPlanName: { type: 'string', nullable: true },
          floorPlanIsImage: { type: 'boolean', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      SubTypeResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              subtype: { $ref: '#/components/schemas/SubType' },
            },
          },
        },
      },
      BatchSubTypeUpdateInput: {
        type: 'object',
        required: ['subtypes'],
        properties: {
          subtypes: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Existing subtype ID to rename (omit to create new)' },
                label: { type: 'string', description: 'Subtype label' },
              },
            },
            description: 'Array of subtypes — items with id rename existing, items without id create new. Array order sets display order.',
          },
        },
      },
      BatchSubTypeUpdateInputMultipart: {
        type: 'object',
        required: ['subtypes[0][label]'],
        properties: {
          'subtypes[0][id]': { type: 'string', description: 'Existing subtype ID to rename (omit to create new)' },
          'subtypes[0][label]': { type: 'string', description: 'Label for the first subtype' },
          'subtypes[0][floorPlan]': { type: 'string', format: 'binary', description: 'Floor plan file for the first subtype (PDF, JPG, PNG — max 10MB)' },
          'subtypes[1][id]': { type: 'string', description: 'Existing subtype ID to rename (omit to create new)' },
          'subtypes[1][label]': { type: 'string', description: 'Label for the second subtype (optional)' },
          'subtypes[1][floorPlan]': { type: 'string', format: 'binary', description: 'Floor plan file for the second subtype (optional)' },
          'subtypes[2][id]': { type: 'string', description: 'Existing subtype ID to rename (omit to create new)' },
          'subtypes[2][label]': { type: 'string', description: 'Label for the third subtype (optional)' },
          'subtypes[2][floorPlan]': { type: 'string', format: 'binary', description: 'Floor plan file for the third subtype (optional)' },
          'subtypes[3][id]': { type: 'string', description: 'Existing subtype ID to rename (omit to create new)' },
          'subtypes[3][label]': { type: 'string', description: 'Label for the fourth subtype (optional)' },
          'subtypes[3][floorPlan]': { type: 'string', format: 'binary', description: 'Floor plan file for the fourth subtype (optional)' },
          'subtypes[4][id]': { type: 'string', description: 'Existing subtype ID to rename (omit to create new)' },
          'subtypes[4][label]': { type: 'string', description: 'Label for the fifth subtype (optional)' },
          'subtypes[4][floorPlan]': { type: 'string', format: 'binary', description: 'Floor plan file for the fifth subtype (optional)' },
          'subtypes[5][id]': { type: 'string', description: 'Existing subtype ID to rename (omit to create new)' },
          'subtypes[5][label]': { type: 'string', description: 'Label for the sixth subtype (optional)' },
          'subtypes[5][floorPlan]': { type: 'string', format: 'binary', description: 'Floor plan file for the sixth subtype (optional)' },
          'subtypes[6][id]': { type: 'string', description: 'Existing subtype ID to rename (omit to create new)' },
          'subtypes[6][label]': { type: 'string', description: 'Label for the seventh subtype (optional)' },
          'subtypes[6][floorPlan]': { type: 'string', format: 'binary', description: 'Floor plan file for the seventh subtype (optional)' },
          'subtypes[7][id]': { type: 'string', description: 'Existing subtype ID to rename (omit to create new)' },
          'subtypes[7][label]': { type: 'string', description: 'Label for the eighth subtype (optional)' },
          'subtypes[7][floorPlan]': { type: 'string', format: 'binary', description: 'Floor plan file for the eighth subtype (optional)' },
          'subtypes[8][id]': { type: 'string', description: 'Existing subtype ID to rename (omit to create new)' },
          'subtypes[8][label]': { type: 'string', description: 'Label for the ninth subtype (optional)' },
          'subtypes[8][floorPlan]': { type: 'string', format: 'binary', description: 'Floor plan file for the ninth subtype (optional)' },
          'subtypes[9][id]': { type: 'string', description: 'Existing subtype ID to rename (omit to create new)' },
          'subtypes[9][label]': { type: 'string', description: 'Label for the tenth subtype (optional)' },
          'subtypes[9][floorPlan]': { type: 'string', format: 'binary', description: 'Floor plan file for the tenth subtype (optional)' },
        },
      },
      BatchSubTypeUpdateResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              subtypes: { type: 'array', items: { $ref: '#/components/schemas/SubType' } },
            },
          },
        },
      },
      UnitTypesSummaryResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              unitTypes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    label: { type: 'string' },
                    subtypes: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          label: { type: 'string' },
                          hasFloorPlan: { type: 'boolean' },
                        },
                      },
                    },
                    paymentPlans: { type: 'array', items: { $ref: '#/components/schemas/PaymentPlan' } },
                  },
                },
              },
            },
          },
        },
      },
      FloorPlansListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              floorPlans: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    label: { type: 'string' },
                    floorPlanPath: { type: 'string', nullable: true },
                    floorPlanName: { type: 'string', nullable: true },
                    floorPlanIsImage: { type: 'boolean', nullable: true },
                  },
                },
              },
            },
          },
        },
      },
      PaymentPlan: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          unitTypeId: { type: 'string' },
          planType: { type: 'string', enum: ['normal', 'event', 'both'] },
          label: { type: 'string' },
          dp: { type: 'number' },
          installmentPct: { type: 'number' },
          durationType: { type: 'string', enum: ['till_handover', 'fixed_months'] },
          durationMonths: { type: 'integer', nullable: true },
          discount: { type: 'number' },
          eventName: { type: 'string', nullable: true },
          eventDiscount: { type: 'number', nullable: true },
          eventInstallmentPct: { type: 'number', nullable: true },
          eventDurationType: { type: 'string', nullable: true },
          eventDurationMonths: { type: 'integer', nullable: true },
          sortOrder: { type: 'integer', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      PaymentPlanTemplate: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Stable template identifier (e.g. tpl-10dp-1pct)' },
          label: { type: 'string' },
          dp: { type: 'number' },
          installmentPct: { type: 'number' },
          durationType: { type: 'string' },
          durationMonths: { type: 'integer', nullable: true },
          discount: { type: 'number' },
          planType: { type: 'string' },
          eventName: { type: 'string', nullable: true },
          eventDiscount: { type: 'number', nullable: true },
          eventInstallmentPct: { type: 'number', nullable: true },
          eventDurationType: { type: 'string' },
          eventDurationMonths: { type: 'integer', nullable: true },
        },
      },
      TemplatePlansResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              templates: { type: 'array', items: { $ref: '#/components/schemas/PaymentPlanTemplate' } },
            },
          },
        },
      },
      PaymentPlansInput: {
        type: 'object',
        required: ['plans'],
        properties: {
          plans: {
            type: 'array',
            items: {
              type: 'object',
              required: ['label', 'dp'],
              properties: {
                label: { type: 'string' },
                dp: { type: 'number', description: 'Down payment percentage (0–100)' },
                installmentPct: { type: 'number', default: 0 },
                durationType: { type: 'string', enum: ['till_handover', 'fixed_months'], default: 'till_handover' },
                durationMonths: { type: 'integer', nullable: true },
                discount: { type: 'number', default: 0 },
                planType: { type: 'string', enum: ['normal', 'event', 'both'], default: 'normal' },
                eventName: { type: 'string', nullable: true },
                eventDiscount: { type: 'number', nullable: true },
                eventInstallmentPct: { type: 'number', nullable: true },
                eventDurationType: { type: 'string', default: 'till_handover' },
                eventDurationMonths: { type: 'integer', nullable: true },
              },
            },
          },
        },
      },
      PaymentPlansResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              plans: { type: 'array', items: { $ref: '#/components/schemas/PaymentPlan' } },
            },
          },
        },
      },
      PaymentPlanInput: {
        type: 'object',
        required: ['label', 'dp'],
        properties: {
          label: { type: 'string' },
          dp: { type: 'number', description: 'Down payment percentage (0–100)' },
          installmentPct: { type: 'number', default: 0 },
          durationType: { type: 'string', enum: ['till_handover', 'fixed_months'], default: 'till_handover' },
          durationMonths: { type: 'integer', nullable: true },
          discount: { type: 'number', default: 0 },
          planType: { type: 'string', enum: ['normal', 'event', 'both'], default: 'normal' },
          eventName: { type: 'string', nullable: true },
          eventDiscount: { type: 'number', nullable: true },
          eventInstallmentPct: { type: 'number', nullable: true },
          eventDurationType: { type: 'string', default: 'till_handover' },
          eventDurationMonths: { type: 'integer', nullable: true },
        },
      },
      PaymentPlanSingleResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              plan: { $ref: '#/components/schemas/PaymentPlan' },
            },
          },
        },
      },
      // ---------- Availability Schemas ----------
      AvailabilityUnit: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          number: { type: 'string', description: 'Unit number' },
          typeId: { type: 'string', description: 'FK to unit type' },
          type: { type: 'string', description: 'Unit type label' },
          subtype: { type: 'string', nullable: true, description: 'Unit subtype label' },
          floor: { type: 'string' },
          internal: { type: 'number', description: 'Internal area' },
          external: { type: 'number', description: 'External area' },
          total: { type: 'number', description: 'Total area' },
          price: { type: 'number' },
          isGhost: { type: 'boolean', description: 'Whether this is a ghost unit' },
          createdBy: { type: 'string', nullable: true, description: 'Who created the unit' },
        },
      },
      AvailabilityProjectGroup: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          projectName: { type: 'string' },
          unitCount: { type: 'integer' },
          units: { type: 'array', items: { $ref: '#/components/schemas/AvailabilityUnit' } },
        },
      },
      AvailabilityResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              projects: { type: 'array', items: { $ref: '#/components/schemas/AvailabilityProjectGroup' } },
            },
          },
        },
      },
      ImportAvailabilityResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              projects: { type: 'array', items: { $ref: '#/components/schemas/AvailabilityProjectGroup' } },
              summary: {
                type: 'object',
                properties: {
                  totalImported: { type: 'integer' },
                  totalSkipped: { type: 'integer' },
                },
              },
            },
          },
        },
      },
      DeleteUnitResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
        },
      },
      AvailabilityProjectsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              projects: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    location: { type: 'string' },
                    type: { type: 'string' },
                    completionDate: { type: 'string' },
                    primaryColor: { type: 'string' },
                    secondaryColor: { type: 'string' },
                    unitCount: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      // ---------- New Offer Schemas ----------

      AvailabilityUnitsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              projectId: { type: 'string' },
              projectName: { type: 'string' },
              unitCount: { type: 'integer' },
              unitTypes: { type: 'array', items: { type: 'string' }, description: 'Distinct unit type labels for the dropdown filter' },
              units: { type: 'array', items: { $ref: '#/components/schemas/AvailabilityUnit' } },
            },
          },
        },
      },
      AvailabilityPaymentPlansResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              unitId: { type: 'string' },
              unitNumber: { type: 'string' },
              unitType: { type: 'string' },
              projectName: { type: 'string' },
              paymentPlans: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    unitTypeId: { type: 'string' },
                    unitTypeLabel: { type: 'string' },
                    planType: { type: 'string', enum: ['normal', 'event', 'both'] },
                    label: { type: 'string' },
                    dp: { type: 'number' },
                    installmentPct: { type: 'number' },
                    onHandover: { type: 'number', description: 'Computed remaining percentage due at handover' },
                    durationType: { type: 'string', enum: ['till_handover', 'fixed_months'] },
                    durationMonths: { type: 'integer', nullable: true },
                    discount: { type: 'number' },
                    eventName: { type: 'string', nullable: true },
                    eventDiscount: { type: 'number', nullable: true },
                    eventInstallmentPct: { type: 'number', nullable: true },
                    eventDurationType: { type: 'string', nullable: true },
                    eventDurationMonths: { type: 'integer', nullable: true },
                    sortOrder: { type: 'integer', nullable: true },
                  },
                },
              },
            },
          },
        },
      },
      // ---------- Offers Schemas ----------
      CreateOfferInput: {
        type: 'object',
        required: ['projectName', 'unitNumber', 'planLabel', 'clientName', 'listPrice', 'netPrice'],
        properties: {
          projectId: { type: 'string' },
          projectName: { type: 'string' },
          unitId: { type: 'string' },
          unitNumber: { type: 'string' },
          unitType: { type: 'string' },
          subType: { type: 'string' },
          planId: { type: 'string' },
          planLabel: { type: 'string' },
          offerMode: { type: 'string', enum: ['normal', 'event', 'allplans', 'comparison', 'recovery'] },
          isEvent: { type: 'boolean' },
          clientName: { type: 'string' },
          clientPhone: { type: 'string' },
          listPrice: { type: 'number' },
          discount: { type: 'number' },
          netPrice: { type: 'number' },
          extraDiscount: { type: 'number' },
          day7Payment: { type: 'number' },
          currency: { type: 'string' },
          exchangeRate: { type: 'number' },
          schedule: { type: 'array', items: { type: 'object' } },
          fees: { type: 'object' },
          type: { type: 'string', enum: ['single', 'allplans', 'comparison', 'recovery'] },
          action: { type: 'string' },
          agentToggles: {
            type: 'object',
            properties: {
              showAgentName: { type: 'boolean' },
              showAgentPhone: { type: 'boolean' },
              showAgentEmail: { type: 'boolean' },
            },
          },
        },
      },
      Offer: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          agentId: { type: 'string' },
          agentName: { type: 'string' },
          projectName: { type: 'string' },
          unitNumber: { type: 'string' },
          clientName: { type: 'string' },
          planLabel: { type: 'string' },
          netPrice: { type: 'number' },
          type: { type: 'string' },
        },
      },
      OfferHistory: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
          agentId: { type: 'string' },
          agentName: { type: 'string' },
          clientName: { type: 'string' },
          clientPhone: { type: 'string' },
          projectName: { type: 'string' },
          unitNumber: { type: 'string' },
          unitType: { type: 'string' },
          planLabel: { type: 'string' },
          offerMode: { type: 'string' },
          discount: { type: 'number' },
          netPrice: { type: 'number' },
          type: { type: 'string' },
          action: { type: 'string' },
        },
      },
      OffersListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              offers: { type: 'array', items: { $ref: '#/components/schemas/OfferHistory' } },
              pagination: { $ref: '#/components/schemas/Pagination' },
              stats: { $ref: '#/components/schemas/OfferStats' },
            },
          },
        },
      },
      OfferStats: {
        type: 'object',
        properties: {
          totalOffers: { type: 'integer' },
          thisMonth: { type: 'integer' },
          singleOffers: { type: 'integer' },
          multiPlan: { type: 'integer' },
        },
      },
      // ---------- Settings Schemas ----------
      SettingsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { $ref: '#/components/schemas/Settings' },
        },
      },
      Settings: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          teamName: { type: 'string' },
          fxRates: {
            type: 'object',
            nullable: true,
            description: 'Latest FX rates fetched from fxapi.app',
            properties: {
              base: { type: 'string', example: 'USD' },
              timestamp: { type: 'string', format: 'date-time' },
              rates: {
                type: 'object',
                description: 'Currency code to rate map (e.g. { "AED": 3.673, "USD": 1, "EUR": 0.92 })',
                additionalProperties: { type: 'number' },
              },
            },
          },
        },
      },
      UpdateSettingsInput: {
        type: 'object',
        description: 'All fields optional — only provided fields are updated',
        properties: {
          teamName: { type: 'string' },
          usdRate: { type: 'number' },
          eurRate: { type: 'number' },
          gbpRate: { type: 'number' },
          inrRate: { type: 'number' },
          rubRate: { type: 'number' },
          audRate: { type: 'number' },
          cadRate: { type: 'number' },
          sarRate: { type: 'number' },
          pkrRate: { type: 'number' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      PdfGenerateInput: {
        type: 'object',
        required: ['offerData', 'template'],
        properties: {
          offerData: {
            type: 'object',
            description: 'Complete offer data (project, unit, plan, schedule, fees, etc.)',
          },
          template: {
            type: 'string',
            enum: ['single-offer', 'comparison', 'all-plans'],
            description: 'Which EJS template to render',
          },
          format: {
            type: 'string',
            enum: ['A4', 'A3'],
            description: 'PDF page size (default: A4)',
          },
        },
      },
    },
  },
};

export default swaggerSpec;
