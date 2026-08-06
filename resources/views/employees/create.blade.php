@extends('layouts.app')

@section('title', 'Add Employee')
@section('page_title', 'Add Employee')

@section('content')
@include('employees._form', ['employee' => null])
@endsection
