import { HttpClient } from "@angular/common/http";
import {Injectable} from "@angular/core";

@Injectable()
export class UploadService {

    constructor(private http: HttpClient) { }

    async uploadThought(formData: FormData) {
        return this.http.post('/api/upload', formData)
            .toPromise();
    }

}