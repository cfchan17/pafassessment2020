import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from '../authentication.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  errorMessage = ''
  form: FormGroup;

	constructor(private fb: FormBuilder, private router: Router, private loginService: AuthenticationService) { }

	ngOnInit(): void {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  async authenticate() {
    const username = this.form.get('username').value;
    const password = this.form.get('password').value;

    this.loginService.authenticateUser({username, password})
      .then(result => {
        this.loginService.setUserCredentials({username, password});
        this.form.reset();
        this.router.navigate(['main']);
      })
      .catch(err => {
        this.errorMessage = "Incorrect credentials entered!";
      });
  }

}
