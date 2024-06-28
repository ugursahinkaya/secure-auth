import { GenericRouter } from "@ugursahinkaya/generic-router";
import { SecureFetch } from "@ugursahinkaya/secure-fetch";
import { SecureFetchApiOperations } from "@ugursahinkaya/shared-types";

export class SecureAuth<
  TOperations extends SecureFetchApiOperations,
> extends GenericRouter<TOperations> {
  protected api: SecureFetch<SecureFetchApiOperations>;
  constructor(
    public authUrl: string,
    operations: TOperations
  ) {
    console.log("SecureAuth constructor", Object.keys(operations));
    super(operations);
    const fetchApiOperations = {
      ...operations,
      readyToFetch: () => {
        console.log("readyToFetch!");
        this.call("loginOrRegister");
      },
    } as SecureFetchApiOperations;

    this.api = new SecureFetch(authUrl, fetchApiOperations);
  }
  queryTokenValue() {
    return this.api.queryTokenValue();
  }
  async resetPassword(phone: string) {
    return this.api.fetch(`${this.authUrl}/resetPassword`, { phone });
  }
  async register(
    phone: string,
    firstName: string,
    lastName: string,
    password: string,
    password2: string
  ) {
    return this.api.fetch(`${this.authUrl}/register`, {
      phone,
      firstName,
      lastName,
      password,
      password2,
    });
  }
  async changePassword(phone: string, password: string, password2: string) {
    return this.api.fetch(`${this.authUrl}/changePassword`, {
      phone,
      password,
      password2,
    });
  }
  async validate(phone: string, smsToken: string, validationToken: string) {
    return this.api.fetch(`${this.authUrl}/validate`, {
      phone,
      smsToken,
      validationToken,
    });
  }
  async whoIs(queryToken: string) {
    return await this.api.fetch(`${this.authUrl}/getUserData`, {
      userQueryToken: queryToken,
    });
  }
  async checkUserName(username: string, register: boolean) {
    const res = await this.api.fetch(`${this.authUrl}/checkPhoneNumber`, {
      username,
      register,
    });
    if (res.data === "invalid_user") {
      delete res.data;
      res.error = "Hatalı kullanıcı adı";
    }
    return res;
  }
  async logout() {
    await this.api.fetch(`${this.authUrl}/logout`, {});
    await this.call("loggedOut", { channel: "rest", secure: true });
  }
  async login(username: string, password: string) {
    const loginRes = await this.api.fetch(`${this.authUrl}/login`, {
      username,
      password,
    });
    if (loginRes.error) {
      await this.call(
        "loginError",
        { channel: "rest", secure: true },
        loginRes.error
      );
      return loginRes;
    }
    if (loginRes.queryToken) {
      await this.call("loggedIn", loginRes.queryToken);
    }

    if (loginRes.process) {
      await this.call(
        loginRes.process,
        { channel: "rest", secure: true },
        loginRes
      );
    }
    return loginRes;
  }
}
