import { HttpClient } from "@angular/common/http";
import {Injectable} from "@angular/core";
import { User } from "./models";

@Injectable()
export class AuthenticationService {

    user: User = {
        username: "",
        password: ""
    }

    username:string;
    password:string;

    constructor(private http: HttpClient) { }

    async authenticateUser(user: User) {
        return await this.http.post('/api/authenticate', user)
            .toPromise();
    }

    setUserCredentials(user: User): void {
        this.user.username = user.username;
        this.user.password = user.password;
    }

    getUserCredentials(): User {
        return this.user;
    }
}
