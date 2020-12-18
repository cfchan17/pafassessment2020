import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from '../authentication.service';
import {CameraService} from '../camera.service';
import { UploadService } from '../upload.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {
	imagePath = '/assets/cactus.png'
	form: FormGroup;

	constructor(private http: HttpClient, private cameraSvc: CameraService, private router: Router, private fb: FormBuilder, private uploader: UploadService, private loginService: AuthenticationService) { }

	ngOnInit(): void {
	  this.form = this.fb.group({
		  title: ['', Validators.required],
		  comments: ['', Validators.required]
	  });

	  if (this.cameraSvc.hasImage()) {
		  const img = this.cameraSvc.getImage()
		  this.imagePath = img.imageAsDataUrl
	  }
	  else {
		  this.clear();
	  }
	}

	isFormValid(): boolean {
		return this.cameraSvc.hasImage() && this.form.valid;
	}

	clear() {
		this.imagePath = '/assets/cactus.png';
	}

	async upload() {
		const user = this.loginService.getUserCredentials();
		const formData = new FormData();
    	formData.set('title', this.form.get('title').value);
		formData.set('comments', this.form.get('comments').value);
		formData.set('username', user.username);
		formData.set('password', user.password);
    	formData.set('file', this.cameraSvc.getImage().imageData);

		await this.uploader.uploadThought(formData)
			.then(result => {
				console.log(result);
				this.imagePath = '/assets/cactus.png';
				this.cameraSvc.clear();
				this.form.reset();
			})
			.catch(error => {
				if(error.status == 401) {
					console.log(error);
					this.imagePath = '/assets/cactus.png';
					this.cameraSvc.clear();
					this.form.reset();
					this.router.navigate(['/']);
				}
				else {
					console.log('Error: ', error);
				}
			});
	}
}