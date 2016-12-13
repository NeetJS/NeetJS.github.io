var students_class_a = [
	{'id': '10001', 'name': 'Winston', 'mobile': '+xx xxxx-xxx-xxxx'},
	{'id': '10002', 'name': 'Reinhardt', 'mobile': '+xx xxxx-xxx-xxxx'}
];
var students_class_b = [
	{'id': '10003', 'name': 'Sombra', 'mobile': '+xx xxxx-xxx-xxxx'}
];
var students_class_c = [
];
var students_all = [].concat(students_class_a, students_class_b, students_class_c);
var staffs = [
	{'id': '20001', 'name': 'Anna', 'office': 'Room 101, Building A', 'mobile': '+xx xxxx-xxx-xxxx'}
];

var demo_load_all = function () {
	$('.mainpanel').ntReplace({
		'class': 'org-neetjs-demo-allpage',
		'data': {
			'students': students_all,
			'staffs': staffs
		}
	});
};

var demo_load_student = function (type) {
	var students = [];
	switch(type) {
	case 'a':
		students = students_class_a;
		break;
	case 'b':
		students = students_class_b;
		break;
	case 'c':
		students = students_class_c;
		break;
	default:
		students = students_all;
		break;
	}
	$('.mainpanel').ntReplace({
		'class': 'org-neetjs-demo-studentpage',
		'data': {
			'students': students
		}
	});
};

var demo_load_staff = function () {
	$('.mainpanel').ntReplace({
		'class': 'org-neetjs-demo-staffpage',
		'data': {
			'staffs': staffs
		}
	});
};
