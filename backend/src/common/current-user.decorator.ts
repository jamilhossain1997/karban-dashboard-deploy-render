import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Pulled out of req.user, which JwtStrategy populates after validating the token.
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
